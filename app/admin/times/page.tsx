"use client";

import React, { useEffect, useState } from "react";
import ExcelJS from "exceljs";
import { supabase } from "@/lib/supabaseClient";
import { getBusinessId } from "@/lib/getBusinessId";
import DiperaPopup from "@/components/DiperaPopup";

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
};

type EmployeeTargetHour = {
  id: string;
  employee_id: string;
  weekly_hours: number;
  monthly_hours: number;
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

function showDiperaPopup(text: string) {
  setPopupMessage(text);
  setShowPopup(true);
}

function showSuccess(text: string) {
  setSuccessMessage(text);
  setShowSuccessPopup(true);
}

function showConfirm(text: string, action: () => void) {
  setConfirmMessage(text);
  setConfirmAction(() => action);
  setShowConfirmPopup(true);
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
      .select("id, name, account_status")
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
    .select("name")
    .eq("id", businessId)
    .single();

  if (error) {
    console.error(error);
    return;
  }

  if (data?.name) {
    setBusinessName(data.name);
  }
}

useEffect(() => {
  loadTimeEntries();
  loadEmployees();
  loadBusiness();
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

      worksheet.addRow([
        employeeName,
        data.days,
        `${monthlyHours} Std.`,
        formatMinutes(
          data.workMinutes
        ),
        formatMinutes(
          data.pauseMinutes
        ),
        saldo,
        status,
      ]);
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
    { width: 28 },
  ];

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
}
  const dailySummaries = buildDailySummaries(timeEntries);
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
      Excel exportieren
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
        <h2 className="text-2xl font-semibold text-blue-950 mb-4">
          Tagesübersicht
        </h2>

        <div className="xl:hidden flex flex-col gap-4">
          {todaysDailySummaries.map((summary) => (
            <div
              key={summary.key}
              className="bg-gray-50 rounded-2xl p-4 border shadow-sm"
            >
              <div className="mb-4">
                <h3 className="text-lg font-bold text-blue-950">
                  {summary.employee_name}
                </h3>
                <p className="text-sm text-gray-500">{summary.date}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                <div className="bg-white rounded-xl p-3">
                  <p className="text-gray-500 mb-1">Arbeitszeit</p>
                  <p className="font-semibold text-black">
                    {summary.start} - {summary.end}
                  </p>
                </div>

                <div className="bg-white rounded-xl p-3">
                  <p className="text-gray-500 mb-1">Gesamt</p>
                  <p className="font-bold text-green-700">
                    {summary.workDuration}
                  </p>
                </div>

                <div className="bg-white rounded-xl p-3 col-span-2">
                  <p className="text-gray-500 mb-1">Pause</p>
                  <p className="font-bold text-yellow-600">
                    {summary.pauseDuration}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                {summary.end === "Offen" && (
                  <button
                    type="button"
                    onClick={() =>
                      handleQuickAddFromSummary(summary, "check_out")
                    }
                    className="w-full bg-green-600 text-white px-4 py-3 rounded-xl hover:bg-green-700 transition"
                  >
                    Ausstempeln ergänzen
                  </button>
                )}

                <button
                  onClick={() =>
                    setOpenDetails(
                      openDetails === summary.key ? null : summary.key
                    )
                  }
                  className="w-full bg-blue-950 text-white px-4 py-3 rounded-xl hover:bg-blue-900 transition"
                >
                  Stempelverlauf
                </button>
              </div>

              {openDetails === summary.key && (
                <div className="mt-4 bg-white rounded-xl p-4">
                  <h4 className="font-bold text-blue-950 mb-3">
                    Stempelverlauf
                  </h4>

                  <div className="flex flex-col gap-2">
                    {summary.entries.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex justify-between border-b py-2 text-black text-sm"
                      >
                        <span>{formatAction(entry.action)}</span>
                        <span>{formatTime(entry.created_at)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="hidden xl:block overflow-x-auto max-w-full">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b text-gray-600">
                <th className="py-3 px-3">Mitarbeiter</th>
                <th className="py-3 px-3">Datum</th>
                <th className="py-3 px-3">Arbeitszeit</th>
                <th className="py-3 px-3">Gesamt</th>
                <th className="py-3 px-3">Pause</th>
                <th className="py-3 px-3">Aktionen</th>
              </tr>
            </thead>

            <tbody>
              {dailySummaries.map((summary) => (
                <React.Fragment key={summary.key}>
                  <tr className="border-b">
                    <td className="py-3 px-3 text-black">
                      {summary.employee_name}
                    </td>

                    <td className="py-3 px-3 text-black">
                      {summary.date}
                    </td>

                    <td className="py-3 px-3 text-black">
                      {summary.start} - {summary.end}
                    </td>

                    <td className="py-3 px-3 font-bold text-green-700">
                      {summary.workDuration}
                    </td>

                    <td className="py-3 px-3 text-yellow-600 font-bold">
                      {summary.pauseDuration}
                    </td>

                    <td className="py-3 px-3">
                      <div className="flex gap-2">
                        {summary.end === "Offen" && (
                          <button
                            type="button"
                            onClick={() =>
                              handleQuickAddFromSummary(summary, "check_out")
                            }
                            className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition"
                          >
                            Ausstempeln ergänzen
                          </button>
                        )}

                        <button
                          onClick={() =>
                            setOpenDetails(
                              openDetails === summary.key ? null : summary.key
                            )
                          }
                          className="bg-blue-950 text-white px-4 py-2 rounded-lg hover:bg-blue-900 transition"
                        >
                          Stempelverlauf
                        </button>
                      </div>
                    </td>
                  </tr>

                  {openDetails === summary.key && (
                    <tr>
                      <td colSpan={6} className="bg-gray-100 p-4">
                        <div className="rounded-xl bg-white p-4">
                          <h3 className="font-bold text-blue-950 mb-3">
                            Stempelverlauf
                          </h3>

                          <div className="flex flex-col gap-2">
                            {summary.entries.map((entry) => (
                              <div
                                key={entry.id}
                                className="flex justify-between border-b py-2 text-black"
                              >
                                <span>{formatAction(entry.action)}</span>
                                <span>{formatTime(entry.created_at)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {todaysDailySummaries.length === 0 && (
          <p className="text-gray-500 mt-4">
            Noch keine Arbeitszeiten vorhanden.
          </p>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow p-4 md:p-6 mb-8">
        <h2 className="text-2xl font-semibold text-blue-950 mb-4">
          Wochenübersicht
        </h2>

        <div className="hidden xl:block overflow-x-auto max-w-full">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b text-gray-600">
                <th className="py-3 px-3">Mitarbeiter</th>
                <th className="py-3 px-3">Woche</th>
                <th className="py-3 px-3">Arbeitsstunden</th>
                <th className="py-3 px-3">Pausenzeit</th>
              </tr>
            </thead>

            <tbody>
              {weeklySummaries.map((summary) => (
                <tr key={summary.key} className="border-b">
                  <td className="py-3 px-3 text-black">
                    {summary.employee_name}
                  </td>

                  <td className="py-3 px-3 text-black">
                    {summary.period}
                  </td>

                  <td className="py-3 px-3 font-bold text-green-700">
                    {formatMinutes(summary.workMinutes)}
                  </td>

                  <td className="py-3 px-3 font-bold text-yellow-600">
                    {formatMinutes(summary.pauseMinutes)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="xl:hidden flex flex-col gap-4">
          {weeklySummaries.map((summary) => (
            <div
              key={summary.key}
              className="bg-gray-50 rounded-2xl p-4 border shadow-sm"
            >
              <h3 className="text-lg font-bold text-blue-950">
                {summary.employee_name}
              </h3>

              <p className="text-sm text-gray-500 mb-4">
                {summary.period}
              </p>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-white rounded-xl p-3">
                  <p className="text-gray-500 mb-1">Arbeitsstunden</p>
                  <p className="font-bold text-green-700">
                    {formatMinutes(summary.workMinutes)}
                  </p>
                </div>

                <div className="bg-white rounded-xl p-3">
                  <p className="text-gray-500 mb-1">Pausenzeit</p>
                  <p className="font-bold text-yellow-600">
                    {formatMinutes(summary.pauseMinutes)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {weeklySummaries.length === 0 && (
          <p className="text-gray-500 mt-4">
            Noch keine Wochenwerte vorhanden.
          </p>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow p-4 md:p-6">
        <h2 className="text-2xl font-semibold text-blue-950 mb-4">
          Monatsübersicht
        </h2>

        <div className="hidden xl:block overflow-x-auto max-w-full">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b text-gray-600">
                <th className="py-3 px-3">Mitarbeiter</th>
                <th className="py-3 px-3">Monat</th>
                <th className="py-3 px-3">Arbeitsstunden</th>
                <th className="py-3 px-3">Pausenzeit</th>
              </tr>
            </thead>

            <tbody>
              {monthlySummaries.map((summary) => (
                <tr key={summary.key} className="border-b">
                  <td className="py-3 px-3 text-black">
                    {summary.employee_name}
                  </td>

                  <td className="py-3 px-3 text-black">
                    {summary.period}
                  </td>

                  <td className="py-3 px-3 font-bold text-green-700">
                    {formatMinutes(summary.workMinutes)}
                  </td>

                  <td className="py-3 px-3 font-bold text-yellow-600">
                    {formatMinutes(summary.pauseMinutes)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="xl:hidden flex flex-col gap-4">
          {monthlySummaries.map((summary) => (
            <div
              key={summary.key}
              className="bg-gray-50 rounded-2xl p-4 border shadow-sm"
            >
              <h3 className="text-lg font-bold text-blue-950">
                {summary.employee_name}
              </h3>

              <p className="text-sm text-gray-500 mb-4">
                {summary.period}
              </p>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-white rounded-xl p-3">
                  <p className="text-gray-500 mb-1">Arbeitsstunden</p>
                  <p className="font-bold text-green-700">
                    {formatMinutes(summary.workMinutes)}
                  </p>
                </div>

                <div className="bg-white rounded-xl p-3">
                  <p className="text-gray-500 mb-1">Pausenzeit</p>
                  <p className="font-bold text-yellow-600">
                    {formatMinutes(summary.pauseMinutes)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {monthlySummaries.length === 0 && (
          <p className="text-gray-500 mt-4">
            Noch keine Monatswerte vorhanden.
          </p>
        )}
      </div>
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