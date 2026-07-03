"use client";

import React, { useEffect, useState } from "react";
import ExcelJS from "exceljs";
import { supabase } from "@/lib/supabaseClient";
import { getBusinessId } from "@/lib/getBusinessId";
import DiperaPopup from "@/components/DiperaPopup";
import PageHeader from "@/components/ui/PageHeader";
import PageActions from "@/components/ui/PageActions";
import Section from "@/components/ui/Section";
import StatCard from "@/components/ui/StatCard";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Badge from "@/components/ui/Badge";
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
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);

  return new Date(
    year,
    month - 1,
    day,
    hour,
    minute,
    0
  ).toISOString();
}

function buildDailySummaries(entries: TimeEntry[]): WorkSummary[] {
  const entriesByEmployee: Record<string, TimeEntry[]> = {};

  entries.forEach((entry) => {
    if (!entriesByEmployee[entry.employee_id]) {
      entriesByEmployee[entry.employee_id] = [];
    }

    entriesByEmployee[entry.employee_id].push(entry);
  });

  const summaries: WorkSummary[] = [];

  Object.entries(entriesByEmployee).forEach(([employeeId, employeeEntries]) => {
    const sortedEntries = [...employeeEntries].sort(
      (a, b) =>
        new Date(a.created_at).getTime() -
        new Date(b.created_at).getTime()
    );

    let currentSession: TimeEntry[] = [];

    sortedEntries.forEach((entry) => {
      if (entry.action === "check_in") {
        if (currentSession.length > 0) {
          summaries.push(buildSummaryFromEntries(currentSession));
        }

        currentSession = [entry];
        return;
      }

      if (currentSession.length === 0) {
        currentSession = [entry];
      } else {
        currentSession.push(entry);
      }

      if (entry.action === "check_out") {
        summaries.push(buildSummaryFromEntries(currentSession));
        currentSession = [];
      }
    });

    if (currentSession.length > 0) {
      summaries.push(buildSummaryFromEntries(currentSession));
    }
  });

  return summaries;
}

function buildSummaryFromEntries(sortedEntries: TimeEntry[]): WorkSummary {
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

  const dateSource = checkIn || sortedEntries[0];
  const rawDate = formatDateForDatabase(
    new Date(dateSource.created_at)
  );

  return {
    key: `${sortedEntries[0].employee_id}-${rawDate}-${sortedEntries[0].id}`,
    employee_id: sortedEntries[0].employee_id,
    employee_name: sortedEntries[0].employee_name,
    date: formatDate(dateSource.created_at),
    rawDate,
    start: checkIn ? formatTime(checkIn.created_at) : "Offen",
    end: checkOut ? formatTime(checkOut.created_at) : "Offen",
    workMinutes,
    pauseMinutes,
    workDuration:
      checkIn && checkOut ? formatMinutes(workMinutes) : "Noch offen",
    pauseDuration: formatMinutes(pauseMinutes),
    entries: sortedEntries,
  };
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
  formatDateForDatabase(new Date()).slice(0, 7)
);
const [viewMonth, setViewMonth] = useState(
  formatDateForDatabase(new Date()).slice(0, 7)
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

  setViewMonth(formatDateForDatabase(date).slice(0, 7));
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
    const [year, month, day] =
  selectedDate.split("-").map(Number);

const nextDay = new Date(
  year,
  month - 1,
  day
);

nextDay.setDate(nextDay.getDate() + 1);

entryDate = formatDateForDatabase(nextDay);
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

  const monthEmployeeCount = Object.keys(employeeMonthGroups).length;
  const monthWorkMinutes = monthSummaries.reduce(
    (sum, summary) => sum + summary.workMinutes,
    0
  );
  const todayWorkMinutes = todaysDailySummaries.reduce(
    (sum, summary) => sum + summary.workMinutes,
    0
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Arbeitszeiten"
        description="Prüfe Stempelungen, ergänze fehlende Zeiten und exportiere Monatsdaten."
        action={
          <PageActions>
            <Button
              type="button"
              variant="secondary"
              onClick={handleExportExcel}
            >
              Excel & CSV exportieren
            </Button>
          </PageActions>
        }
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Arbeitstage im Monat"
          value={monthSummaries.length}
        />

        <StatCard
          title="Mitarbeiter im Monat"
          value={monthEmployeeCount}
        />

        <StatCard
          title="Arbeitszeit heute"
          value={formatMinutes(todayWorkMinutes)}
          badge="Heute"
          badgeVariant="primary"
        />

        <StatCard
          title="Arbeitszeit Monat"
          value={formatMinutes(monthWorkMinutes)}
          badge={new Date(`${viewMonth}-01`).toLocaleDateString("de-DE", {
            month: "short",
          })}
          badgeVariant="muted"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Section
          title="Excel-Export"
          description="Wähle einen Monat und exportiere Arbeitszeiten sowie DATEV-Vorbereitung."
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto] md:items-end">
            <Input
              label="Exportmonat"
              type="month"
              value={exportMonth}
              onChange={(event) => setExportMonth(event.target.value)}
            />

            <Button
              type="button"
              variant="primary"
              onClick={handleExportExcel}
            >
              Excel & CSV exportieren
            </Button>
          </div>
        </Section>

        <Section
          title="Stempel hinzufügen"
          description="Nutze diese Funktion, wenn ein Mitarbeiter vergessen hat, sich ein- oder auszustempeln."
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Select
              label="Mitarbeiter"
              value={selectedEmployeeId}
              onChange={(event) => setSelectedEmployeeId(event.target.value)}
              options={[
                { value: "", label: "Mitarbeiter auswählen" },
                ...employees.map((employee) => ({
                  value: employee.id,
                  label: employee.name,
                })),
              ]}
            />

            <Select
              label="Aktion"
              value={selectedAction}
              onChange={(event) => setSelectedAction(event.target.value)}
              options={[
                { value: "check_in", label: "Einstempeln" },
                { value: "break_start", label: "Pausenbeginn" },
                { value: "break_end", label: "Pausenende" },
                { value: "check_out", label: "Ausstempeln" },
              ]}
            />

            <Input
              label="Datum"
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
            />

            <Input
              label="Uhrzeit"
              type="time"
              value={selectedTime}
              onChange={(event) => setSelectedTime(event.target.value)}
            />
          </div>

          <div className="mt-6">
            <Button
              type="button"
              variant="primary"
              onClick={() => handleAddTimeEntry()}
            >
              Stempel speichern
            </Button>
          </div>
        </Section>
      </div>

      <Section
        title="Monatsübersicht"
        description="Arbeitszeiten pro Mitarbeiter im ausgewählten Monat."
        action={
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => changeMonth(-1)}
              aria-label="Vorheriger Monat"
            >
              ←
            </Button>

            <div className="min-w-[160px] text-center text-sm font-medium text-[#111827]">
              {new Date(`${viewMonth}-01`).toLocaleDateString("de-DE", {
                month: "long",
                year: "numeric",
              })}
            </div>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => changeMonth(1)}
              aria-label="Nächster Monat"
            >
              →
            </Button>
          </div>
        }
      >
        {Object.keys(employeeMonthGroups).length === 0 ? (
          <div className="rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] p-8 text-center text-sm text-[#6B7280]">
            In diesem Monat wurden noch keine Arbeitszeiten erfasst.
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(employeeMonthGroups).map(
              ([employeeId, group]) => (
                <details
                  key={employeeId}
                  className="rounded-3xl border border-[#E5E7EB] bg-[#F8FAFC] p-4 transition open:bg-white"
                >
                  <summary className="cursor-pointer list-none">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <h3 className="text-lg font-medium tracking-[-0.02em] text-[#111827]">
                          {group.employeeName}
                        </h3>

                        <p className="mt-1 text-sm text-[#6B7280]">
                          {group.entries.length} Arbeitstag(e)
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3">
                          <p className="text-xs text-[#6B7280]">
                            Arbeitszeit
                          </p>
                          <p className="mt-1 font-medium text-[#111827]">
                            {formatMinutes(group.totalWorkMinutes)}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3">
                          <p className="text-xs text-[#6B7280]">Pause</p>
                          <p className="mt-1 font-medium text-[#111827]">
                            {formatMinutes(group.totalPauseMinutes)}
                          </p>
                        </div>
                      </div>

                      <Badge variant="primary">Details anzeigen</Badge>
                    </div>
                  </summary>

                  <div className="mt-5 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[#E5E7EB] text-left text-xs font-medium uppercase tracking-[0.08em] text-[#6B7280]">
                          <th className="py-3 pr-4">Datum</th>
                          <th className="py-3 pr-4">Beginn</th>
                          <th className="py-3 pr-4">Ende</th>
                          <th className="py-3 pr-4">Pause</th>
                          <th className="py-3 pr-4">Arbeitszeit</th>
                          <th className="py-3 pr-4">Status</th>
                          <th className="py-3 pr-4 text-right">Aktion</th>
                        </tr>
                      </thead>

                      <tbody>
                        {group.entries.map((summary) => (
                          <tr
                            key={summary.key}
                            className="border-b border-[#E5E7EB] last:border-b-0"
                          >
                            <td className="py-4 pr-4 font-medium text-[#111827]">
                              {summary.date}
                            </td>

                            <td className="py-4 pr-4 text-[#6B7280]">
                              {summary.start || "-"}
                            </td>

                            <td className="py-4 pr-4 text-[#6B7280]">
                              {summary.end || "-"}
                            </td>

                            <td className="py-4 pr-4 text-[#6B7280]">
                              {formatMinutes(summary.pauseMinutes)}
                            </td>

                            <td className="py-4 pr-4 font-medium text-[#111827]">
                              {formatMinutes(summary.workMinutes)}
                            </td>

                            <td className="py-4 pr-4">
                              <Badge variant="muted">Erfasst</Badge>
                            </td>

                            <td className="py-4 pr-4 text-right">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenEditSummary(summary)}
                              >
                                Bearbeiten
                              </Button>
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
      </Section>

      {editingSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111827]/35 p-6 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[28px] border border-[#E5E7EB] bg-white p-6 shadow-[0_24px_70px_rgba(17,24,39,0.18)]">
            <h2 className="text-2xl font-light tracking-[-0.03em] text-[#111827]">
              Arbeitszeit bearbeiten
            </h2>

            <p className="mt-2 text-sm text-[#6B7280]">
              {editingSummary.employee_name} · {editingSummary.date}
            </p>

            <div className="mt-6 grid grid-cols-1 gap-4">
              <Input
                label="Arbeitsbeginn"
                type="time"
                value={editStartTime === "Offen" ? "" : editStartTime}
                onChange={(event) => setEditStartTime(event.target.value)}
              />

              <Input
                label="Arbeitsende"
                type="time"
                value={editEndTime === "Offen" ? "" : editEndTime}
                onChange={(event) => setEditEndTime(event.target.value)}
              />
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                variant="primary"
                fullWidth
                onClick={handleSaveEditedSummary}
              >
                Speichern
              </Button>

              <Button
                type="button"
                variant="danger"
                fullWidth
                onClick={handleAskDeleteEditedSummary}
              >
                Löschen
              </Button>

              <Button
                type="button"
                variant="secondary"
                fullWidth
                onClick={() => setEditingSummary(null)}
              >
                Abbrechen
              </Button>
            </div>
          </div>
        </div>
      )}

      <DiperaPopup
        open={Boolean(pendingDeleteSummary)}
        message={
          pendingDeleteSummary
            ? `Möchtest du die Arbeitszeit von ${pendingDeleteSummary.employee_name} am ${pendingDeleteSummary.date} wirklich löschen?`
            : ""
        }
        onClose={() => setPendingDeleteSummary(null)}
        onConfirm={handleConfirmDeleteSummary}
        confirmText="Ja, löschen"
        cancelText="Abbrechen"
      />

      <DiperaPopup
        open={showPopup}
        message={popupMessage}
        onClose={() => setShowPopup(false)}
      />

      <DiperaPopup
        open={showSuccessPopup}
        message={successMessage}
        onClose={() => setShowSuccessPopup(false)}
      />

      <DiperaPopup
        open={showConfirmPopup}
        message={confirmMessage}
        onClose={() => setShowConfirmPopup(false)}
        onConfirm={() => {
          confirmAction?.();
          setShowConfirmPopup(false);
        }}
        confirmText="Bestätigen"
        cancelText="Abbrechen"
      />
    </div>
  );
}
