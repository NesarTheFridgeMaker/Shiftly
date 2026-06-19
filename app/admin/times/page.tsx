"use client";

import React, { useEffect, useState } from "react";
import ExcelJS from "exceljs";
import { supabase } from "@/lib/supabaseClient";
import { getBusinessId } from "@/lib/getBusinessId";
import DiperaPopup from "@/components/DiperaPopup";
import {
  buildWorkSessions
} from "@/lib/payroll/buildWorkSessions";

import {
  calculateSurcharges
} from "@/lib/payroll/calculateSurcharges";
import {
  calculatePayrollPreview
} from "@/lib/payroll/calculatePayrollPreview";

type TimeEntry = {
  id: string;
  employee_id: string;
  employee_name: string;
  action: string;
  created_at: string;
};

type Employee = {
  id: string;
  name: string;
  account_status: string;
  datev_personnel_number: string | null;
  cost_center: string | null;
  wage_type: "hourly" | "fixed_hourly" | "salary" | null;
  hourly_rate: number | null;
  monthly_salary: number | null;
  eligible_for_surcharges: boolean;
};

type EmployeeTargetHour = {
  id: string;
  employee_id: string;
  weekly_hours: number;
  monthly_hours: number;
};

type PayRule = {
  id: string;
  name: string;
  rule_type: string;
  starts_at: string | null;
  ends_at: string | null;
  percentage: number;
  datev_wage_type: string | null;
  active: boolean;
};

type Absence = {
  id: string;
  employee_id: string;
  employee_name: string;
  type: "vacation" | "sick" | string;
  start_date: string;
  end_date: string;
  request_status: string;
  business_id: string;
};

type WorkSummary = {
  key: string;
  employee_id: string;
  employee_name: string;
  date: string;
  rawDate: string;
  start: string;
  end: string;
  workMinutes: number;
  pauseMinutes: number;
  workDuration: string;
  pauseDuration: string;
  entries: TimeEntry[];
};

type PeriodSummary = {
  key: string;
  employee_name: string;
  period: string;
  workMinutes: number;
  pauseMinutes: number;
};

function formatAction(action: string) {
  if (action === "check_in") return "Einstempeln";
  if (action === "break_start") return "Pausenbeginn";
  if (action === "break_end") return "Pausenende";
  if (action === "check_out") return "Ausstempeln";
  return action;
}

function formatTime(dateString: string) {
  return new Date(dateString).toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("de-DE");
}

function formatDateForDatabase(date: Date) {
  return date.toLocaleDateString("en-CA");
}

function formatMonth(dateString: string) {
  return new Date(dateString).toLocaleDateString("de-DE", {
    month: "long",
    year: "numeric",
  });
}

function getWeekNumber(date: Date) {
  const copiedDate = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
  const dayNumber = copiedDate.getUTCDay() || 7;

  copiedDate.setUTCDate(copiedDate.getUTCDate() + 4 - dayNumber);

  const yearStart = new Date(Date.UTC(copiedDate.getUTCFullYear(), 0, 1));

  return Math.ceil(
    ((copiedDate.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );
}

function formatWeek(dateString: string) {
  const date = new Date(dateString);
  const week = getWeekNumber(date);
  const year = date.getFullYear();

  return `KW ${week} / ${year}`;
}

function formatMinutes(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours <= 0) {
    return `${minutes} Min.`;
  }

  return `${hours} Std. ${minutes} Min.`;
}

function buildDateTime(date: string, time: string) {
  return new Date(`${date}T${time}:00`).toISOString();
}

function buildDailySummaries(entries: TimeEntry[]): WorkSummary[] {
  const groups: Record<string, TimeEntry[]> = {};

entries.forEach((entry) => {
  const entryDate = new Date(entry.created_at);

  // Nachts zwischen 00:00–05:59
  // wird dem Vortag zugeordnet
  if (entryDate.getHours() < 6) {
    entryDate.setDate(
      entryDate.getDate() - 1
    );
  }

  const date =
    formatDateForDatabase(entryDate);

  const key =
    `${entry.employee_id}-${date}`;

  if (!groups[key]) {
    groups[key] = [];
  }

  groups[key].push(entry);
});

  return Object.entries(groups).map(([key, groupEntries]) => {
    const sortedEntries = [...groupEntries].sort(
      (a, b) =>
        new Date(a.created_at).getTime() -
        new Date(b.created_at).getTime()
    );

    const checkIn = sortedEntries.find(
      (entry) => entry.action === "check_in"
    );

    const checkOut = [...sortedEntries]
      .reverse()
      .find((entry) => entry.action === "check_out");

    let pauseMinutes = 0;
    let currentPauseStart: Date | null = null;

    sortedEntries.forEach((entry) => {
      if (entry.action === "break_start") {
        currentPauseStart = new Date(entry.created_at);
      }

      if (entry.action === "break_end" && currentPauseStart) {
        const pauseEnd = new Date(entry.created_at);

        pauseMinutes += Math.round(
          (pauseEnd.getTime() - currentPauseStart.getTime()) / 60000
        );

        currentPauseStart = null;
      }
    });

    let workMinutes = 0;

    if (checkIn && checkOut) {
      const start = new Date(checkIn.created_at);
      const end = new Date(checkOut.created_at);

      workMinutes = Math.round(
        (end.getTime() - start.getTime()) / 60000
      );

      workMinutes = workMinutes - pauseMinutes;
    }

    return {
      key,
      employee_id: sortedEntries[0].employee_id,
      employee_name: sortedEntries[0].employee_name,
      date: formatDate(sortedEntries[0].created_at),
      rawDate: formatDateForDatabase(new Date(sortedEntries[0].created_at)),
      start: checkIn ? formatTime(checkIn.created_at) : "Offen",
      end: checkOut ? formatTime(checkOut.created_at) : "Offen",
      workMinutes,
      pauseMinutes,
      workDuration:
        checkIn && checkOut ? formatMinutes(workMinutes) : "Noch offen",
      pauseDuration: formatMinutes(pauseMinutes),
      entries: sortedEntries,
    };
  });
}

function buildPeriodSummaries(
  dailySummaries: WorkSummary[],
  periodType: "week" | "month"
): PeriodSummary[] {
  const groups: Record<string, PeriodSummary> = {};

  dailySummaries.forEach((summary) => {
    const firstEntry = summary.entries[0];

    const period =
      periodType === "week"
        ? formatWeek(firstEntry.created_at)
        : formatMonth(firstEntry.created_at);

    const key = `${summary.employee_id}-${period}`;

    if (!groups[key]) {
      groups[key] = {
        key,
        employee_name: summary.employee_name,
        period,
        workMinutes: 0,
        pauseMinutes: 0,
      };
    }

    groups[key].workMinutes += summary.workMinutes;
    groups[key].pauseMinutes += summary.pauseMinutes;
  });

  return Object.values(groups);
}

export default function TimesPage() {
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [targetHours, setTargetHours] = useState<EmployeeTargetHour[]>([]);
  const [absences, setAbsences] = useState<Absence[]>([]);
  function countAbsenceDaysForMonth(
  employeeId: string,
  type: "vacation" | "sick",
  month: string
) {
  const [year, monthNumber] = month.split("-").map(Number);

  const monthStart = new Date(year, monthNumber - 1, 1);
  const monthEnd = new Date(year, monthNumber, 0);

  let count = 0;

  absences
    .filter(
      (absence) =>
        absence.employee_id === employeeId &&
        absence.type === type
    )
    .forEach((absence) => {
      const start = new Date(absence.start_date);
      const end = new Date(absence.end_date);

      const current = new Date(
        Math.max(start.getTime(), monthStart.getTime())
      );

      const final = new Date(
        Math.min(end.getTime(), monthEnd.getTime())
      );

      while (current <= final) {
        count += 1;
        current.setDate(current.getDate() + 1);
      }
    });

  return count;
}
  const [payRules, setPayRules] =
  useState<PayRule[]>([]);
  const [federalState, setFederalState] =
  useState("BW");
  const [
  datevRegularHoursWageType,
  setDatevRegularHoursWageType
] = useState("100");
const [
  datevSalaryWageType,
  setDatevSalaryWageType
] = useState("101");
const [
  datevOvertimeWageType,
  setDatevOvertimeWageType
] = useState("130");
const [
  datevVacationWageType,
  setDatevVacationWageType
] = useState("140");

const [
  datevSickWageType,
  setDatevSickWageType
] = useState("141");
  const [openDetails, setOpenDetails] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState("Dipera");
  const [popupMessage, setPopupMessage] = useState("");
  const [showPopup, setShowPopup] = useState(false);

const [confirmMessage, setConfirmMessage] = useState("");
const [confirmAction, setConfirmAction] =
  useState<(() => void) | null>(null);

const [showConfirmPopup, setShowConfirmPopup] =
  useState(false);

const [successMessage, setSuccessMessage] =
  useState("");

const [showSuccessPopup, setShowSuccessPopup] =
  useState(false);

  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [selectedAction, setSelectedAction] = useState("check_in");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [exportMonth, setExportMonth] = useState(
  new Date().toISOString().slice(0, 7)
);
const [viewMonth, setViewMonth] = useState(
  new Date().toISOString().slice(0, 7)
);
const [openEmployeeId, setOpenEmployeeId] =
  useState<string | null>(null);
  const [editingSummary, setEditingSummary] =
  useState<WorkSummary | null>(null);

const [editStartTime, setEditStartTime] =
  useState("");

const [editEndTime, setEditEndTime] =
  useState("");
  const [pendingDeleteSummary, setPendingDeleteSummary] =
  useState<WorkSummary | null>(null);

function showDiperaPopup(text: string) {
  setPopupMessage(text);
  setShowPopup(true);
}

function showSuccess(text: string) {
  setSuccessMessage(text);
  setShowSuccessPopup(true);
}

function changeMonth(direction: number) {
  const date = new Date(`${viewMonth}-01`);

  date.setMonth(date.getMonth() + direction);

  setViewMonth(date.toISOString().slice(0, 7));
}

function showConfirm(text: string, action: () => void) {
  setConfirmMessage(text);
  setConfirmAction(() => action);
  setShowConfirmPopup(true);
}

function handleOpenEditSummary(summary: WorkSummary) {
  setEditingSummary(summary);
  setEditStartTime(summary.start || "");
  setEditEndTime(summary.end || "");
}

function handleAskDeleteEditedSummary() {
  if (!editingSummary) return;

  setPendingDeleteSummary(editingSummary);
}

async function handleSaveEditedSummary() {
  if (!editingSummary) return;

  const checkInEntry =
    editingSummary.entries.find(
      (entry) => entry.action === "check_in"
    );

  const checkOutEntry =
    editingSummary.entries.find(
      (entry) => entry.action === "check_out"
    );

  if (!checkInEntry || !checkOutEntry) {
    showDiperaPopup(
      "Diese Arbeitszeit kann nicht automatisch bearbeitet werden, weil Ein- oder Ausstempelung fehlt."
    );
    return;
  }

  const startDateTime =
    `${editingSummary.rawDate}T${editStartTime}:00`;

  const endDateTime =
    `${editingSummary.rawDate}T${editEndTime}:00`;

  const startDate =
    new Date(startDateTime);

  let endDate =
    new Date(endDateTime);

  if (endDate <= startDate) {
    endDate.setDate(
      endDate.getDate() + 1
    );
  }

  const { error: startError } =
    await supabase
      .from("time_entries")
      .update({
        created_at: startDate.toISOString(),
      })
      .eq("id", checkInEntry.id);

  if (startError) {
    console.error(startError);
    showDiperaPopup(
      "Arbeitsbeginn konnte nicht gespeichert werden."
    );
    return;
  }

  const { error: endError } =
    await supabase
      .from("time_entries")
      .update({
        created_at: endDate.toISOString(),
      })
      .eq("id", checkOutEntry.id);

  if (endError) {
    console.error(endError);
    showDiperaPopup(
      "Arbeitsende konnte nicht gespeichert werden."
    );
    return;
  }

  setEditingSummary(null);

  await loadTimeEntries();

  showDiperaPopup(
    "Arbeitszeit wurde aktualisiert."
  );
}

async function handleConfirmDeleteSummary() {
  if (!pendingDeleteSummary) return;

  const entryIds = pendingDeleteSummary.entries.map(
    (entry) => entry.id
  );

  if (entryIds.length === 0) {
    showDiperaPopup("Keine Stempelungen zum Löschen gefunden.");
    return;
  }

  const { error } = await supabase
    .from("time_entries")
    .delete()
    .in("id", entryIds);

  if (error) {
    console.error(error);
    showDiperaPopup("Arbeitszeit konnte nicht gelöscht werden.");
    return;
  }

  setPendingDeleteSummary(null);
  setEditingSummary(null);

  await loadTimeEntries();

  showDiperaPopup("Arbeitszeit wurde gelöscht.");
}


  async function loadTimeEntries() {
    const businessId = await getBusinessId();

    if (!businessId) {
      console.error("Keine Business-ID gefunden.");
      return;
    }

    const { data, error } = await supabase
      .from("time_entries")
      .select("*")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      showDiperaPopup(
  "Es ist ein Fehler aufgetreten. Bitte versuche es erneut."
);
      return;
    }

    setTimeEntries(data || []);
  }

  async function loadEmployees() {
    const businessId = await getBusinessId();

    if (!businessId) {
      console.error("Keine Business-ID gefunden.");
      return;
    }

    const { data, error } = await supabase
      .from("employees")
      .select("id, name, account_status, datev_personnel_number, cost_center, wage_type, hourly_rate, monthly_salary, eligible_for_surcharges")
      .eq("business_id", businessId)
      .eq("account_status", "active")
      .order("name", { ascending: true });

    if (error) {
      console.error(error);
      return;
    }

    setEmployees(data || []);
  }

  async function loadBusiness() {
  const businessId = await getBusinessId();

  if (!businessId) return;

  const { data, error } = await supabase
    .from("businesses")
    .select(
  "name, federal_state, datev_regular_hours_wage_type, datev_salary_wage_type, datev_overtime_wage_type, datev_vacation_wage_type, datev_sick_wage_type"
)
    .eq("id", businessId)
    .single();

  if (error) {
    console.error(error);
    return;
  }

  if (data.datev_overtime_wage_type) {
  setDatevOvertimeWageType(
    data.datev_overtime_wage_type
  );
}

  if (data.datev_salary_wage_type) {
  setDatevSalaryWageType(
    data.datev_salary_wage_type
  );
}

  if (data?.name) {
    setBusinessName(data.name);
  }
  if (data.federal_state) {
  setFederalState(
    data.federal_state
  );
}

if (data.datev_regular_hours_wage_type) {
  setDatevRegularHoursWageType(
    data.datev_regular_hours_wage_type
  );
}

if (data.datev_vacation_wage_type) {
  setDatevVacationWageType(data.datev_vacation_wage_type);
}

if (data.datev_sick_wage_type) {
  setDatevSickWageType(data.datev_sick_wage_type);
}

}


useEffect(() => {
  loadTimeEntries();
  loadEmployees();
  loadBusiness();
  loadTargetHours();
  loadPayRules();
  loadAbsences();
}, []);

  async function loadTargetHours() {
  const businessId = await getBusinessId();

  if (!businessId) return;

  const { data, error } = await supabase
    .from("employee_target_hours")
    .select("id, employee_id, weekly_hours, monthly_hours")

  if (error) {
    console.error(error);
    return;
  }

  setTargetHours((data || []) as EmployeeTargetHour[]);
}

async function loadPayRules() {
  const businessId =
    await getBusinessId();

  if (!businessId) return;

  const { data,error } =
    await supabase
    .from("pay_rules")
    .select("*")
    .eq(
      "business_id",
      businessId
    )
    .eq(
      "active",
      true
    );

  if(error){
    console.error(error);
    return;
  }

  setPayRules(data || []);
}

async function loadAbsences() {
  const businessId = await getBusinessId();

  if (!businessId) return;

  const { data, error } = await supabase
    .from("absences")
    .select(
      "id, employee_id, employee_name, type, start_date, end_date, request_status, business_id"
    )
    .eq("business_id", businessId)
    .eq("request_status", "approved");

  if (error) {
    console.error(error);
    return;
  }

  setAbsences(data || []);
}

  async function handleAddTimeEntry(skipNightCheck = false) {
    if (!selectedEmployeeId || !selectedAction || !selectedDate || !selectedTime) {
      showDiperaPopup(
  "Bitte Mitarbeiter, Aktion, Datum und Uhrzeit auswählen."
);
      return;
    }

    const businessId = await getBusinessId();

    if (!businessId) {
      showDiperaPopup("Keine Business-ID gefunden.");
      return;
    }

    const selectedEmployee = employees.find(
      (employee) => employee.id === selectedEmployeeId
    );
    

    if (!selectedEmployee) {
      showDiperaPopup("Mitarbeiter nicht gefunden.");
      return;
    }

    let entryDate = selectedDate;

if (selectedAction === "check_out") {
  const selectedHour =
    Number(selectedTime.split(":")[0]);

if (
  selectedHour < 6 &&
  !skipNightCheck
) {
    showConfirm(
      "Diese Uhrzeit liegt nachts. Soll der Stempel als Folgetag gespeichert werden?",
      () => {
  handleAddTimeEntry(true);
}
    );

    return;
  }

  if (selectedHour < 6) {
    const nextDay = new Date(selectedDate);

    nextDay.setDate(
      nextDay.getDate() + 1
    );

    entryDate =
      nextDay.toISOString()
      .split("T")[0];
  }
}

    const createdAt = buildDateTime(entryDate, selectedTime);

    const { error } = await supabase.from("time_entries").insert([
      {
        employee_id: selectedEmployee.id,
        employee_name: selectedEmployee.name,
        action: selectedAction,
        created_at: createdAt,
        business_id: businessId,
      },
    ]);

    if (error) {
      console.error(error);
      showDiperaPopup(
  "Es ist ein Fehler aufgetreten. Bitte versuche es erneut."
);
      return;
    }

    let newEmployeeStatus = "";

if (selectedAction === "check_in") {
  newEmployeeStatus = "checked_in";
}

if (selectedAction === "break_start") {
  newEmployeeStatus = "on_break";
}

if (selectedAction === "break_end") {
  newEmployeeStatus = "checked_in";
}

if (selectedAction === "check_out") {
  newEmployeeStatus = "not_checked_in";
}

if (newEmployeeStatus) {
  const { error: statusError } = await supabase
    .from("employees")
    .update({ status: newEmployeeStatus })
    .eq("id", selectedEmployee.id)
    .eq("business_id", businessId);

  if (statusError) {
    console.error(statusError);
    showDiperaPopup(
  "Es ist ein Fehler aufgetreten. Bitte versuche es erneut."
);
    return;
  }
}

    setSelectedEmployeeId("");
    setSelectedAction("check_in");
    setSelectedDate("");
    setSelectedTime("");

    await loadTimeEntries();

    showSuccess("Stempel wurde hinzugefügt.");
  }

  async function handleQuickAddFromSummary(
    summary: WorkSummary,
    action: string
  ) {
    setSelectedEmployeeId(summary.employee_id);
    setSelectedAction(action);
    setSelectedDate(summary.rawDate);
    setSelectedTime("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

async function handleExportExcel() {
  const selectedSummaries = dailySummaries.filter((summary) =>
    summary.rawDate.startsWith(exportMonth)
  );

  if (selectedSummaries.length === 0) {
    showDiperaPopup("Für diesen Monat gibt es keine Arbeitszeiten.");
    return;
  }

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Arbeitszeiten");
  const datevSheet = workbook.addWorksheet("DATEV-Vorbereitung");
  const payrollSheet = workbook.addWorksheet("Lohnübersicht");
  const datevRows: Array<Array<string | number>> = [];

function addDatevRow(row: Array<string | number>) {
  datevRows.push(row);
  datevSheet.addRow(row);
}

const datevCsvHeader = [
  "Personalnummer",
  "Mitarbeiter",
  "Kostenstelle",
  "Lohnart",
  "Bezeichnung",
  "Menge",
  "Einheit",
  "Prozent",
  "Betrag",
];

datevSheet.mergeCells("A1:H1");
datevSheet.getCell("A1").value =
  `${businessName} — DATEV-Vorbereitung ${exportMonth}`;
datevSheet.getCell("A1").font = { bold: true, size: 18, color: { argb: "FFFFFFFF" } };
datevSheet.getCell("A1").alignment = { horizontal: "center" };
datevSheet.getCell("A1").fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF172554" },
};

datevSheet.mergeCells("A2:H2");
datevSheet.getCell("A2").value =
  "Vorbereitete Bewegungsdaten – keine vollständige Lohnabrechnung";
datevSheet.getCell("A2").font = { italic: true, size: 11 };
datevSheet.getCell("A2").alignment = { horizontal: "center" };

datevSheet.addRow([]);

const datevHeader = datevSheet.addRow([
  "Personalnummer",
  "Mitarbeiter",
  "Kostenstelle",
  "Lohnart",
  "Bezeichnung",
  "Menge",
  "Einheit",
  "Prozent",
  "Betrag",
]);

payrollSheet.mergeCells("A1:I1");
payrollSheet.getCell("A1").value =
  `${businessName} — Lohnübersicht ${exportMonth}`;
payrollSheet.getCell("A1").font = { bold: true, size: 18, color: { argb: "FFFFFFFF" } };
payrollSheet.getCell("A1").alignment = { horizontal: "center" };
payrollSheet.getCell("A1").fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF172554" },
};

payrollSheet.mergeCells("A2:I2");
payrollSheet.getCell("A2").value =
  "Voraussichtliche Bruttowerte zur internen Lohnvorbereitung";
payrollSheet.getCell("A2").font = { italic: true, size: 11 };
payrollSheet.getCell("A2").alignment = { horizontal: "center" };

payrollSheet.addRow([]);

const payrollHeader = payrollSheet.addRow([
  "Mitarbeiter",
  "Vergütungsart",
  "Urlaubstage",
  "Kranktage",
  "Rechnerischer Stundenlohn",
  "Grundlohn",
  "Überstunden",
  "Nachtzuschlag",
  "Sonntagszuschlag",
  "Feiertagszuschlag",
  "Zuschläge gesamt",
  "Voraussichtliches Brutto",
]);

[datevHeader, payrollHeader].forEach((row) => {
  row.font = { bold: true, color: { argb: "FFFFFFFF" } };

  row.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1E3A8A" },
    };

    cell.alignment = {
      horizontal: "center",
      vertical: "middle",
    };

    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });
});

  const monthDate = new Date(`${exportMonth}-01`);

  const monthLabel = monthDate.toLocaleDateString("de-DE", {
    month: "long",
    year: "numeric",
  });

  worksheet.mergeCells("A1:H1");
  worksheet.getCell("A1").value =
    `${businessName} — Arbeitszeiten ${monthLabel}`;

  worksheet.getCell("A1").font = {
    bold: true,
    size: 18,
  };

  worksheet.getCell("A1").alignment = {
    horizontal: "center",
  };

  worksheet.mergeCells("A2:H2");

  worksheet.getCell("A2").value =
    `Export erstellt am ${new Date().toLocaleDateString("de-DE")}`;

  worksheet.getCell("A2").font = {
    italic: true,
    size: 11,
  };

  worksheet.getCell("A2").alignment = {
    horizontal: "center",
  };

  worksheet.addRow([]);

  const headerRow = worksheet.addRow([
    "Mitarbeiter",
    "Datum",
    "Arbeitsbeginn",
    "Arbeitsende",
    "Pause",
    "Arbeitszeit",
    "Status",
    "Hinweis",
  ]);

  headerRow.font = { bold: true };

  headerRow.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE5E7EB" },
    };
  });

  selectedSummaries.forEach((summary) => {
    worksheet.addRow([
      summary.employee_name,
      summary.date,
      summary.start,
      summary.end,
      summary.pauseDuration,
      summary.workDuration,
      summary.end === "Offen"
        ? "Offen"
        : "Abgeschlossen",

      summary.end === "Offen"
        ? "⚠ Ausstempeln fehlt"
        : "",
    ]);
  });

  worksheet.addRow([]);
  worksheet.addRow([]);

  const summaryTitle = worksheet.addRow([
    "Mitarbeiter-Zusammenfassung",
  ]);

  summaryTitle.font = {
    bold: true,
    size: 14,
  };

  const summaryHeader = worksheet.addRow([
  "Mitarbeiter",
  "Arbeitstage",
  "Monats-Soll",
  "Ist-Arbeitszeit",
  "Pause gesamt",
  "Nachtstunden",
  "Sonntagsstunden",
  "Feiertagsstunden",
  "Urlaubstage",
  "Kranktage",
  "Saldo",
  "Status",
]);

  summaryHeader.font = {
    bold: true,
  };

  const employeeGroups: Record<
    string,
    {
      employeeId: string;
      workMinutes: number;
      pauseMinutes: number;
      days: number;
    }
  > = {};

  selectedSummaries.forEach((summary) => {
    if (!employeeGroups[summary.employee_name]) {
      employeeGroups[summary.employee_name] = {
        employeeId: summary.employee_id,
        workMinutes: 0,
        pauseMinutes: 0,
        days: 0,
      };
    }

    employeeGroups[summary.employee_name].workMinutes +=
      summary.workMinutes;

    employeeGroups[summary.employee_name].pauseMinutes +=
      summary.pauseMinutes;

    employeeGroups[summary.employee_name].days += 1;
  });

  Object.entries(employeeGroups).forEach(
    ([employeeName, data]) => {

      const target = targetHours.find(
        (targetHour) =>
          targetHour.employee_id ===
          data.employeeId
      );

      const monthlyHours =
        target?.monthly_hours ?? 173;

      const monthlyMinutes =
        monthlyHours * 60;

      const diff =
        data.workMinutes -
        monthlyMinutes;

      let saldo = "Ausgeglichen";
      let status = "Ausgeglichen";

      if (diff > 0) {
        saldo =
          `${formatMinutes(diff)} im Plus`;

        status = "Im Plus";
      }

      if (diff < 0) {
        saldo =
          `${formatMinutes(Math.abs(diff))} im Minus`;

        status = "Im Minus";
      }

const employeeEntries = selectedSummaries
  .filter((summary) => summary.employee_name === employeeName)
  .flatMap((summary) => summary.entries);

const sessions = buildWorkSessions(employeeEntries);

const surchargeResults =
  calculateSurcharges(
    sessions,
    payRules,
    federalState
  );
const nightHours =
  surchargeResults.find((result) => result.ruleType === "night")?.hours ?? 0;

const sundayHours =
  surchargeResults.find((result) => result.ruleType === "sunday")?.hours ?? 0;

const holidayHours =
  surchargeResults.find(
    (result) => result.ruleType === "holiday"
  )?.hours ?? 0;

  const employee = employees.find(
  (item) => item.id === data.employeeId
);

const vacationDays =
  countAbsenceDaysForMonth(
    data.employeeId,
    "vacation",
    exportMonth
  );

const sickDays =
  countAbsenceDaysForMonth(
    data.employeeId,
    "sick",
    exportMonth
  );

const overtimeHours =
  Math.max(
    0,
    Math.round(
      (
        (data.workMinutes / 60) -
        monthlyHours
      ) * 100
    ) / 100
  );

const payrollPreview =
  calculatePayrollPreview({
    employee,
    workHours:
      Math.round((data.workMinutes / 60) * 100) / 100,
    monthlyTargetHours:
      monthlyHours,
      overtimeHours,
    surchargeResults,
  });

payrollSheet.addRow([
  employeeName,
  employee?.wage_type === "salary"
    ? "Monatsgehalt"
    : employee?.wage_type === "fixed_hourly"
    ? "Fixer Monatslohn auf Stundenbasis"
    : "Stundenlohn",

  vacationDays,
  sickDays,

  payrollPreview.calculatedHourlyRate,
  payrollPreview.baseGross,
  payrollPreview.overtimeGross,
  payrollPreview.nightGross,
  payrollPreview.sundayGross,
  payrollPreview.holidayGross,
  payrollPreview.surchargeGross,
  payrollPreview.estimatedGross,
]);

if (
  employee?.wage_type === "hourly" &&
  data.workMinutes > 0 &&
  datevRegularHoursWageType
) {
  addDatevRow([
    employee?.datev_personnel_number || "",
    employeeName,
    employee?.cost_center || "",
    datevRegularHoursWageType,
    "Reguläre Arbeitsstunden",
    Math.round((data.workMinutes / 60) * 100) / 100,
    "Stunden",
    "",
    "",
]);
}

if (
  employee?.wage_type === "salary" &&
  employee.monthly_salary &&
  datevSalaryWageType
) {
  addDatevRow([
    employee?.datev_personnel_number || "",
    employeeName,
    employee?.cost_center || "",
    datevSalaryWageType,
    "Monatsgehalt",
    "",
    "",
    "",
    employee.monthly_salary,
  ]);
}

if (
  overtimeHours > 0 &&
  datevOvertimeWageType
) {
  addDatevRow([
    employee?.datev_personnel_number || "",
    employeeName,
    employee?.cost_center || "",
    datevOvertimeWageType,
    "Überstunden",
    overtimeHours,
    "Stunden",
    "",
    "",
]);
}

if (
  vacationDays > 0 &&
  datevVacationWageType
) {
  addDatevRow([
    employee?.datev_personnel_number || "",
    employeeName,
    employee?.cost_center || "",
    datevVacationWageType,
    "Urlaub",
    vacationDays,
    "Tage",
    "",
    "",
]);
}

if (
  sickDays > 0 &&
  datevSickWageType
) {
  addDatevRow([
    employee?.datev_personnel_number || "",
    employeeName,
    employee?.cost_center || "",
    datevSickWageType,
    "Krankheit",
    sickDays,
    "Tage",
    "",
    "",
]);
}

if (employee?.eligible_for_surcharges !== false) {
  surchargeResults.forEach((result) => {
    if (result.hours <= 0) return;
    if (!result.datevWageType) return;

    addDatevRow([
      employee?.datev_personnel_number || "",
      employeeName,
      employee?.cost_center || "",
      result.datevWageType,
      result.name,
      result.hours,
      "Stunden",
      result.percentage,
      "",
]);
  });
}

worksheet.addRow([
  employeeName,
  data.days,
  `${monthlyHours} Std.`,
  formatMinutes(data.workMinutes),
  formatMinutes(data.pauseMinutes),
  `${nightHours} Std.`,
  `${sundayHours} Std.`,
  `${holidayHours} Std.`,
  vacationDays,
  sickDays,
  saldo,
  status,
]);

const lastRow = datevSheet.lastRow;

if (lastRow) {
  lastRow.eachCell((cell) => {
    cell.border = {
      ...cell.border,
      bottom: {
        style: "thick",
      },
    };
  });
}

    }
  );

worksheet.columns = [
  { width: 25 },
  { width: 15 },
  { width: 18 },
  { width: 18 },
  { width: 18 },
  { width: 18 },
  { width: 18 },
  { width: 18 },
  { width: 15 },
  { width: 15 },
  { width: 18 },
  { width: 28 },
];

datevSheet.columns = [
  { width: 18 }, // Personalnummer
  { width: 25 }, // Mitarbeiter
  { width: 18 }, // Kostenstelle
  { width: 15 }, // Lohnart
  { width: 25 }, // Bezeichnung
  { width: 12 }, // Menge
  { width: 12 }, // Einheit
  { width: 12 }, // Prozent
  { width: 18 }, // Betrag
];

payrollSheet.columns = [
  { width: 25 },
  { width: 18 },
  { width: 24 },
  { width: 15 },
  { width: 30 },
  { width: 18 },
  { width: 18 },
  { width: 18 },
  { width: 24 },
  { width: 18 },
  { width: 18 },
  { width: 24 },
];

datevSheet.getColumn(6).numFmt = "0.00";
datevSheet.getColumn(8).numFmt = "0.00";
datevSheet.getColumn(9).numFmt = '#,##0.00 €';

payrollSheet.getColumn(5).numFmt = '#,##0.00 €';
payrollSheet.getColumn(6).numFmt = '#,##0.00 €';
payrollSheet.getColumn(7).numFmt = '#,##0.00 €';
payrollSheet.getColumn(8).numFmt = '#,##0.00 €';
payrollSheet.getColumn(9).numFmt = '#,##0.00 €';
payrollSheet.getColumn(10).numFmt = '#,##0.00 €';
payrollSheet.getColumn(11).numFmt = '#,##0.00 €';
payrollSheet.getColumn(12).numFmt = '#,##0.00 €';

datevSheet.autoFilter = {
  from: "A4",
  to: "H4",
};

payrollSheet.autoFilter = {
  from: "A4",
  to: "I4",
};

const csvContent = [
  datevCsvHeader.join(";"),
  ...datevRows.map((row) =>
    row
      .map((value) => {
        if (
          value === null ||
          value === undefined
        ) {
          return "";
        }

        if (typeof value === "number") {
          return value
            .toFixed(2)
            .replace(".", ",");
        }

        return String(value);
      })
      .join(";")
  ),
].join("\n");

console.log(csvContent);

  const buffer =
    await workbook.xlsx.writeBuffer();

  const blob = new Blob(
    [buffer],
    {
      type:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }
  );

  const url =
    window.URL.createObjectURL(blob);

  const link =
    document.createElement("a");

  const safeBusinessName =
    businessName.replace(/\s+/g, "-");

  link.href = url;

  link.download =
`${safeBusinessName}-arbeitszeiten-${exportMonth}.xlsx`;

  link.click();

  window.URL.revokeObjectURL(url);
  const csvBlob = new Blob(
  ["\uFEFF" + csvContent],
  {
    type: "text/csv;charset=utf-8;",
  }
);

const csvUrl =
  window.URL.createObjectURL(csvBlob);

const csvLink =
  document.createElement("a");

csvLink.href = csvUrl;

csvLink.download =
  `${safeBusinessName}-datev-vorbereitung-${exportMonth}.csv`;

csvLink.click();

window.URL.revokeObjectURL(csvUrl);
}
  const dailySummaries = buildDailySummaries(timeEntries);
  const monthSummaries = dailySummaries.filter(
  (summary) =>
    summary.rawDate.startsWith(viewMonth)
);
const employeeMonthGroups = monthSummaries.reduce(
  (acc, summary) => {
    if (!acc[summary.employee_id]) {
      acc[summary.employee_id] = {
        employeeName: summary.employee_name,
        entries: [],
        totalWorkMinutes: 0,
        totalPauseMinutes: 0,
      };
    }

    acc[summary.employee_id].entries.push(summary);

    acc[summary.employee_id].totalWorkMinutes +=
      summary.workMinutes;

    acc[summary.employee_id].totalPauseMinutes +=
      summary.pauseMinutes;

    return acc;
  },
  {} as Record<
    string,
    {
      employeeName: string;
      entries: WorkSummary[];
      totalWorkMinutes: number;
      totalPauseMinutes: number;
    }
  >
);
  const weeklySummaries = buildPeriodSummaries(dailySummaries, "week");
  const monthlySummaries = buildPeriodSummaries(dailySummaries, "month");
  const todayRawDate = formatDateForDatabase(new Date());

  const todaysDailySummaries = dailySummaries.filter(
  (summary) => summary.rawDate === todayRawDate
);

  return (
    <div>
      <h1 className="text-3xl md:text-4xl font-bold text-blue-950 mb-6 md:mb-8">
        Arbeitszeiten
      </h1>

      <div className="bg-white rounded-2xl shadow p-4 md:p-6 mb-8">
  <h2 className="text-2xl font-semibold text-blue-950 mb-4">
    Excel-Export
  </h2>

  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
    <input
      type="month"
      value={exportMonth}
      onChange={(event) => setExportMonth(event.target.value)}
      className="border p-3 rounded-lg bg-white text-black"
    />

    <button
      type="button"
      onClick={handleExportExcel}
      className="bg-green-600 text-white px-5 py-3 rounded-xl hover:bg-green-700 transition"
    >
      Excel & CSV exportieren
    </button>

  </div>
</div>

      <div className="bg-white rounded-2xl shadow p-4 md:p-6 mb-8">
        <h2 className="text-2xl font-semibold text-blue-950 mb-4">
          Stempel hinzufügen
        </h2>

        <p className="text-gray-500 mb-5">
          Nutze diese Funktion, wenn ein Mitarbeiter vergessen hat, sich ein-
          oder auszustempeln.
        </p>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
          <select
            value={selectedEmployeeId}
            onChange={(event) => setSelectedEmployeeId(event.target.value)}
            className="border p-3 rounded-lg bg-white text-black"
          >
            <option value="">Mitarbeiter auswählen</option>

            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.name}
              </option>
            ))}
          </select>

          <select
            value={selectedAction}
            onChange={(event) => setSelectedAction(event.target.value)}
            className="border p-3 rounded-lg bg-white text-black"
          >
            <option value="check_in">Einstempeln</option>
            <option value="break_start">Pausenbeginn</option>
            <option value="break_end">Pausenende</option>
            <option value="check_out">Ausstempeln</option>
          </select>

          <input
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
            className="border p-3 rounded-lg bg-white text-black"
          />

          <input
            type="time"
            value={selectedTime}
            onChange={(event) => setSelectedTime(event.target.value)}
            className="border p-3 rounded-lg bg-white text-black"
          />
        </div>

        <button
          type="button"
          onClick={() => handleAddTimeEntry()}
          className="mt-5 w-full md:w-auto bg-blue-950 text-white px-5 py-3 rounded-xl hover:bg-blue-900 transition"
        >
          Stempel speichern
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow p-4 md:p-6 mb-8">
  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
    <div>
      <h2 className="text-2xl font-semibold text-blue-950">
        Monatsübersicht
      </h2>

      <p className="text-sm text-gray-500 mt-1">
        Arbeitszeiten pro Mitarbeiter im ausgewählten Monat
      </p>
    </div>

    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => changeMonth(-1)}
        className="px-4 py-2 rounded-xl bg-gray-100 text-blue-950 font-bold hover:bg-gray-200 transition"
      >
        ←
      </button>

      <div className="min-w-[160px] text-center font-bold text-blue-950">
        {new Date(`${viewMonth}-01`).toLocaleDateString("de-DE", {
          month: "long",
          year: "numeric",
        })}
      </div>

      <button
        type="button"
        onClick={() => changeMonth(1)}
        className="px-4 py-2 rounded-xl bg-gray-100 text-blue-950 font-bold hover:bg-gray-200 transition"
      >
        →
      </button>
    </div>
  </div>

  {Object.keys(employeeMonthGroups).length === 0 ? (
    <div className="bg-gray-50 border rounded-2xl p-6 text-center text-gray-600">
      In diesem Monat wurden noch keine Arbeitszeiten erfasst.
    </div>
  ) : (
    <div className="space-y-4">
      {Object.entries(employeeMonthGroups).map(
        ([employeeId, group]) => (
          <details
            key={employeeId}
            className="bg-gray-50 border rounded-2xl p-4 open:bg-white transition"
          >
            <summary className="cursor-pointer list-none">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-blue-950">
                    {group.employeeName}
                  </h3>

                  <p className="text-sm text-gray-500">
                    {group.entries.length} Arbeitstag(e)
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-white rounded-xl p-3 border">
                    <p className="text-gray-500">Arbeitszeit</p>
                    <p className="font-bold text-blue-950">
                      {formatMinutes(group.totalWorkMinutes)}
                    </p>
                  </div>

                  <div className="bg-white rounded-xl p-3 border">
                    <p className="text-gray-500">Pause</p>
                    <p className="font-bold text-blue-950">
                      {formatMinutes(group.totalPauseMinutes)}
                    </p>
                  </div>

                </div>
                <div className="flex justify-end">
                <span className="bg-blue-950 text-white px-4 py-2 rounded-xl font-semibold inline-block">
                  Details anzeigen
                </span>
              </div>
              </div>
            </summary>

            <div className="mt-5 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="py-3 pr-4">Datum</th>
                    <th className="py-3 pr-4">Beginn</th>
                    <th className="py-3 pr-4">Ende</th>
                    <th className="py-3 pr-4">Pause</th>
                    <th className="py-3 pr-4">Arbeitszeit</th>
                    <th className="py-3 pr-4">Status</th>
                    <th className="py-3 pr-4">Aktion</th>
                  </tr>
                </thead>

                <tbody>
                  {group.entries.map((summary) => (
                    <tr
                      key={summary.key}
                      className="border-b last:border-b-0"
                    >
                      <td className="py-3 pr-4 font-medium text-gray-900">
                        {summary.date}
                      </td>

                      <td className="py-3 pr-4 text-gray-700">
                        {summary.start || "-"}
                      </td>

                      <td className="py-3 pr-4 text-gray-700">
                        {summary.end || "-"}
                      </td>

                      <td className="py-3 pr-4 text-gray-700">
                        {formatMinutes(summary.pauseMinutes)}
                      </td>

                      <td className="py-3 pr-4 font-semibold text-blue-950">
                        {formatMinutes(summary.workMinutes)}
                      </td>

                      <td className="py-3 pr-4">
                      <span className="text-gray-500">
                        —
                      </span>
                      </td>

                      <td className="py-3 pr-4">
                        <button
                        type="button"
                        onClick={() => handleOpenEditSummary(summary)}
                        className="text-blue-700 font-semibold hover:underline"
                      >
                        Bearbeiten
                      </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        )
      )}
    </div>
  )}
</div> 

{editingSummary && (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-50">
    <div className="max-w-lg w-full rounded-3xl bg-white p-6 shadow-2xl">
      <h2 className="text-2xl font-bold text-blue-950 mb-2">
        Arbeitszeit bearbeiten
      </h2>

      <p className="text-gray-600 mb-6">
        {editingSummary.employee_name} — {editingSummary.date}
      </p>

      <div className="grid grid-cols-1 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Arbeitsbeginn
          </label>

          <input
            type="time"
            value={editStartTime === "Offen" ? "" : editStartTime}
            onChange={(event) => setEditStartTime(event.target.value)}
            className="w-full border p-3 rounded-xl bg-white text-black"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Arbeitsende
          </label>

          <input
            type="time"
            value={editEndTime === "Offen" ? "" : editEndTime}
            onChange={(event) => setEditEndTime(event.target.value)}
            className="w-full border p-3 rounded-xl bg-white text-black"
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mt-6">
        <button
          type="button"
          onClick={handleSaveEditedSummary}
          className="flex-1 bg-blue-950 text-white px-5 py-3 rounded-xl font-semibold hover:bg-blue-900 transition"
        >
          Speichern
        </button>

        <button
          type="button"
          onClick={handleAskDeleteEditedSummary}
          className="flex-1 bg-red-600 text-white px-5 py-3 rounded-xl font-semibold hover:bg-red-700 transition"
        >
          Löschen
        </button>

        <button
          type="button"
          onClick={() => setEditingSummary(null)}
          className="flex-1 bg-gray-200 text-gray-800 px-5 py-3 rounded-xl font-semibold hover:bg-gray-300 transition"
        >
          Abbrechen
        </button>
      </div>
    </div>
  </div>
)}

{pendingDeleteSummary && (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-[60]">
    <div className="max-w-lg w-full text-center rounded-3xl border border-white/10 bg-[#0B1220]/95 shadow-2xl p-8 md:p-10">
      <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
        Arbeitszeit löschen?
      </h2>

      <p className="text-white/80 mb-8 leading-relaxed">
        Möchtest du die Arbeitszeit von{" "}
        <span className="font-bold text-white">
          {pendingDeleteSummary.employee_name}
        </span>{" "}
        am{" "}
        <span className="font-bold text-white">
          {pendingDeleteSummary.date}
        </span>{" "}
        wirklich löschen?
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={handleConfirmDeleteSummary}
          className="flex-1 bg-red-600 text-white px-5 py-4 rounded-2xl font-bold hover:bg-red-700 transition"
        >
          Ja, löschen
        </button>

        <button
          type="button"
          onClick={() => setPendingDeleteSummary(null)}
          className="flex-1 bg-white/10 text-white px-5 py-4 rounded-2xl font-bold hover:bg-white/20 transition"
        >
          Abbrechen
        </button>
      </div>
    </div>
  </div>
)}
      {showPopup && (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-50">
    <div className="max-w-lg w-full text-center rounded-3xl border border-white/10 bg-[#0B1220]/95 shadow-2xl p-8 md:p-10">

      <p className="text-2xl md:text-3xl font-bold text-white mb-8 leading-snug">
        {popupMessage}
      </p>

      <button
        type="button"
        onClick={() => setShowPopup(false)}
        className="bg-gradient-to-r from-blue-700 to-blue-500 text-white px-12 py-4 rounded-2xl text-xl font-bold shadow-xl hover:scale-105 transition"
      >
        OK
      </button>

    </div>
  </div>
)}

{showSuccessPopup && (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-50">
    <div className="max-w-lg w-full text-center rounded-3xl border border-white/10 bg-[#0B1220]/95 shadow-2xl p-8 md:p-10">

      <p className="text-2xl md:text-3xl font-bold text-white mb-8 leading-snug">
        {successMessage}
      </p>

      <button
        type="button"
        onClick={() => setShowSuccessPopup(false)}
        className="bg-gradient-to-r from-green-600 to-green-500 text-white px-12 py-4 rounded-2xl text-xl font-bold shadow-xl hover:scale-105 transition"
      >
        OK
      </button>

    </div>
  </div>
)}

{showConfirmPopup && (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-50">
    <div className="max-w-lg w-full text-center rounded-3xl border border-white/10 bg-[#0B1220]/95 shadow-2xl p-8 md:p-10">

      <p className="text-2xl md:text-3xl font-bold text-white mb-8 leading-snug">
        {confirmMessage}
      </p>

      <div className="flex flex-col md:flex-row gap-3 justify-center">

        <button
          type="button"
          onClick={() => setShowConfirmPopup(false)}
          className="bg-gray-600 text-white px-8 py-4 rounded-2xl text-lg font-bold hover:bg-gray-700 transition"
        >
          Abbrechen
        </button>

        <button
          type="button"
          onClick={() => {
            confirmAction?.();
            setShowConfirmPopup(false);
          }}
          className="bg-blue-600 text-white px-8 py-4 rounded-2xl text-lg font-bold hover:bg-blue-700 transition"
        >
          Bestätigen
        </button>

      </div>

    </div>
  </div>
)}
    </div>
  );
}