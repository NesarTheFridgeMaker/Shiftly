"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getBusinessId } from "@/lib/getBusinessId";

type Employee = {
  id: string;
  name: string;
  account_status: string;
};

type Shift = {
  id: string;
  employee_id: string;
  employee_name: string;
  shift_date: string;
  start_time: string;
  end_time: string;
};

type Absence = {
  id: string;
  employee_id: string;
  type: string;
  start_date: string;
  end_date: string;
  request_status: string;
};

type ShiftTemplate = {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
};

function formatDateForDatabase(date: Date) {
  return date.toLocaleDateString("en-CA");
}

function formatDateForDisplay(dateString: string) {
  return new Date(dateString).toLocaleDateString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
}

function getMonday(date: Date) {
  const copiedDate = new Date(date);
  const day = copiedDate.getDay();
  const difference = copiedDate.getDate() - day + (day === 0 ? -6 : 1);

  copiedDate.setDate(difference);
  copiedDate.setHours(0, 0, 0, 0);

  return copiedDate;
}

function addDays(date: Date, days: number) {
  const copiedDate = new Date(date);
  copiedDate.setDate(copiedDate.getDate() + days);
  return copiedDate;
}

function getWeekDays(weekStart: Date) {
  const labels = [
    "Montag",
    "Dienstag",
    "Mittwoch",
    "Donnerstag",
    "Freitag",
    "Samstag",
    "Sonntag",
  ];

  return labels.map((label, index) => {
    const date = addDays(weekStart, index);

    return {
      label,
      date: formatDateForDatabase(date),
      displayDate: formatDateForDisplay(formatDateForDatabase(date)),
    };
  });
}

function formatAbsenceType(type: string) {
  if (type === "vacation") return "Urlaub";
  if (type === "sick") return "Krankheit";
  return type;
}

function isOvernightShift(startTime: string, endTime: string) {
  if (!startTime || !endTime) return false;

  return endTime <= startTime;
}

function formatShiftTime(startTime: string, endTime: string) {
  const startText = startTime.slice(0, 5);
  const endText = endTime.slice(0, 5);

  if (isOvernightShift(startText, endText)) {
    return `${startText} - ${endText} (+1 Tag)`;
  }

  return `${startText} - ${endText}`;
}

export default function SchedulePage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [shiftTemplates, setShiftTemplates] = useState<ShiftTemplate[]>([]);
  const [warning, setWarning] = useState("");

  const [employeeId, setEmployeeId] = useState("");
  const [date, setDate] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);
  const [selectedWeekStart, setSelectedWeekStart] = useState(getMonday(new Date()));

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

  async function loadShifts() {
    const businessId = await getBusinessId();

    if (!businessId) {
      console.error("Keine Business-ID gefunden.");
      return;
    }

    const { data, error } = await supabase
      .from("shifts")
      .select("*")
      .eq("business_id", businessId)
      .order("shift_date", { ascending: true });

    if (error) {
      console.error(error);
      return;
    }

    setShifts(data || []);
  }

  async function loadAbsences() {
    const businessId = await getBusinessId();

    if (!businessId) {
      console.error("Keine Business-ID gefunden.");
      return;
    }

    const { data, error } = await supabase
      .from("absences")
      .select("id, employee_id, type, start_date, end_date, request_status")
      .eq("business_id", businessId)
      .eq("request_status", "approved");

    if (error) {
      console.error(error);
      return;
    }

    setAbsences(data || []);
  }

  async function loadShiftTemplates() {
    const businessId = await getBusinessId();

    if (!businessId) {
      console.error("Keine Business-ID gefunden.");
      return;
    }

    const { data, error } = await supabase
      .from("shift_templates")
      .select("id, name, start_time, end_time")
      .eq("business_id", businessId)
      .order("name", { ascending: true });

    if (error) {
      console.error(error);
      return;
    }

    setShiftTemplates((data || []) as ShiftTemplate[]);
  }

  useEffect(() => {
    loadEmployees();
    loadShifts();
    loadAbsences();
    loadShiftTemplates();
  }, []);

  function resetForm() {
    setEmployeeId("");
    setDate("");
    setSelectedTemplateId("");
    setStart("");
    setEnd("");
    setEditingShiftId(null);
  }

  function getSelectedEmployee() {
    return employees.find((employee) => employee.id === employeeId);
  }

  function handleSelectTemplate(templateId: string) {
    setSelectedTemplateId(templateId);

    if (!templateId) {
      return;
    }

    const selectedTemplate = shiftTemplates.find(
      (template) => template.id === templateId
    );

    if (!selectedTemplate) return;

    setStart(selectedTemplate.start_time.slice(0, 5));
    setEnd(selectedTemplate.end_time.slice(0, 5));
  }

  async function handleSaveShift() {
    if (!employeeId || !date || !start || !end) {
      alert("Bitte Mitarbeiter, Datum, Schichtbeginn und Schichtende ausfüllen.");
      return;
    }

    const businessId = await getBusinessId();

    if (!businessId) {
      alert("Keine Business-ID gefunden.");
      return;
    }

    const selectedEmployee = getSelectedEmployee();

    if (!selectedEmployee) return;

    const absenceForShift = findAbsenceForShift(selectedEmployee.id, date);

    if (absenceForShift) {
      setWarning(
        `Achtung: ${selectedEmployee.name} ist an diesem Tag als ${formatAbsenceType(
          absenceForShift.type
        )} eingetragen. Die Schicht wurde trotzdem gespeichert.`
      );
    } else {
      setWarning("");
    }

    if (editingShiftId) {
      const { error } = await supabase
        .from("shifts")
        .update({
          employee_id: selectedEmployee.id,
          employee_name: selectedEmployee.name,
          shift_date: date,
          start_time: start,
          end_time: end,
        })
        .eq("id", editingShiftId)
        .eq("business_id", businessId);

      if (error) {
        console.error(error);
        alert(JSON.stringify(error, null, 2));
        return;
      }
    } else {
      const { error } = await supabase.from("shifts").insert([
        {
          employee_id: selectedEmployee.id,
          employee_name: selectedEmployee.name,
          shift_date: date,
          start_time: start,
          end_time: end,
          business_id: businessId,
        },
      ]);

      if (error) {
        console.error(error);
        alert(JSON.stringify(error, null, 2));
        return;
      }
    }

    resetForm();
    loadShifts();
  }

  function handleEditShift(shift: Shift) {
    setEditingShiftId(shift.id);
    setEmployeeId(shift.employee_id);
    setDate(shift.shift_date);
    setSelectedTemplateId("");
    setStart(shift.start_time.slice(0, 5));
    setEnd(shift.end_time.slice(0, 5));
    setWarning("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDeleteShift(id: string) {
    const confirmed = confirm("Möchtest du diese Schicht wirklich löschen?");

    if (!confirmed) return;

    const businessId = await getBusinessId();

    if (!businessId) {
      alert("Keine Business-ID gefunden.");
      return;
    }

    const { error } = await supabase
      .from("shifts")
      .delete()
      .eq("id", id)
      .eq("business_id", businessId);

    if (error) {
      console.error(error);
      alert(JSON.stringify(error, null, 2));
      return;
    }

    loadShifts();
  }

  function findAbsenceForShift(employeeId: string, shiftDate: string) {
    return absences.find(
      (absence) =>
        absence.employee_id === employeeId &&
        shiftDate >= absence.start_date &&
        shiftDate <= absence.end_date
    );
  }

  function goToPreviousWeek() {
    setSelectedWeekStart((currentWeekStart) => addDays(currentWeekStart, -7));
  }

  function goToNextWeek() {
    setSelectedWeekStart((currentWeekStart) => addDays(currentWeekStart, 7));
  }

  function goToCurrentWeek() {
    setSelectedWeekStart(getMonday(new Date()));
  }

  async function handleCopyWeekToNext() {
  const businessId = await getBusinessId();

  if (!businessId) {
    alert("Keine Business-ID gefunden.");
    return;
  }

  const currentWeekDays = getWeekDays(selectedWeekStart);

  const weekDates = currentWeekDays.map((day) => day.date);

  const shiftsToCopy = shifts.filter((shift) =>
    weekDates.includes(shift.shift_date)
  );

  if (shiftsToCopy.length === 0) {
    alert("In dieser Woche gibt es keine Schichten.");
    return;
  }

  const copiedShifts = shiftsToCopy.map((shift) => {
    const oldDate = new Date(shift.shift_date);

    const newDate = addDays(oldDate, 7);

    return {
      employee_id: shift.employee_id,
      employee_name: shift.employee_name,
      shift_date: formatDateForDatabase(newDate),
      start_time: shift.start_time,
      end_time: shift.end_time,
      business_id: businessId,
    };
  });

  const targetDates = copiedShifts.map(
  (shift) => shift.shift_date
);

const { data: existingShifts, error: existingError } =
  await supabase
    .from("shifts")
    .select("id")
    .eq("business_id", businessId)
    .in("shift_date", targetDates);

if (existingError) {
  console.error(existingError);
  return;
}

if (existingShifts && existingShifts.length > 0) {
  alert(
    "In der Zielwoche existieren bereits Schichten. Kopieren abgebrochen."
  );
  return;
}

  const confirmed = confirm(
    `${copiedShifts.length} Schichten in nächste Woche kopieren?`
  );

  if (!confirmed) return;

  const { error } = await supabase
    .from("shifts")
    .insert(copiedShifts);

  if (error) {
    console.error(error);
    alert(JSON.stringify(error,null,2));
    return;
  }

  await loadShifts();

  alert("Woche erfolgreich kopiert.");
}

  const todayDate = formatDateForDatabase(new Date());
  const todaysShifts = shifts.filter((shift) => shift.shift_date === todayDate);

  const weekDays = getWeekDays(selectedWeekStart);
  const weekStartText = formatDateForDisplay(weekDays[0].date);
  const weekEndText = formatDateForDisplay(weekDays[6].date);

  return (
    <div>
      <h1 className="text-4xl font-bold text-blue-950 mb-8">
        Dienstplan
      </h1>

      <div className="bg-white rounded-2xl shadow p-6 mb-8">
        <h2 className="text-2xl font-semibold text-blue-950 mb-4">
          {editingShiftId ? "Schicht bearbeiten" : "Neue Schicht eintragen"}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <select
            value={employeeId}
            onChange={(event) => setEmployeeId(event.target.value)}
            className="border p-3 rounded-lg bg-white text-black"
          >
            <option value="">Mitarbeiter auswählen</option>

            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.name}
              </option>
            ))}
          </select>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-gray-600">
              Datum
            </label>

            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="border p-3 rounded-lg bg-white text-black"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-gray-600">
              Vorlage
            </label>

            <select
              value={selectedTemplateId}
              onChange={(event) => handleSelectTemplate(event.target.value)}
              className="border p-3 rounded-lg bg-white text-black"
            >
              <option value="">Manuell</option>

              {shiftTemplates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name} ({formatShiftTime(template.start_time, template.end_time)})
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-gray-600">
              Schichtbeginn
            </label>

            <input
              type="time"
              value={start}
              onChange={(event) => setStart(event.target.value)}
              className="border p-3 rounded-lg bg-white text-black"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-gray-600">
              Schichtende
            </label>

            <input
              type="time"
              value={end}
              onChange={(event) => setEnd(event.target.value)}
              className="border p-3 rounded-lg bg-white text-black"
            />

            {start && end && isOvernightShift(start, end) && (
              <p className="text-xs font-semibold text-blue-700 mt-1">
                Endet am Folgetag
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-3 mt-5">
          <button
            onClick={handleSaveShift}
            className="bg-blue-950 text-white px-5 py-3 rounded-xl cursor-pointer hover:bg-blue-900 hover:scale-105 transition"
          >
            {editingShiftId ? "Änderungen speichern" : "Schicht speichern"}
          </button>

          {editingShiftId && (
            <button
              onClick={resetForm}
              className="bg-gray-500 text-white px-5 py-3 rounded-xl cursor-pointer hover:bg-gray-600 transition"
            >
              Bearbeiten abbrechen
            </button>
          )}
        </div>

        {warning && (
          <div className="mt-5 bg-yellow-100 text-yellow-800 p-4 rounded-xl font-semibold">
            {warning}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow p-6 mb-8">
        <h2 className="text-2xl font-semibold text-blue-950 mb-4">
          Wer arbeitet heute?
        </h2>

        {todaysShifts.length > 0 ? (
          <div className="flex flex-col gap-3">
            {todaysShifts.map((shift) => (
              <div
                key={shift.id}
                className="bg-blue-50 rounded-xl p-4 text-black flex flex-col md:flex-row md:justify-between gap-3"
              >
                <div>
                  <p className="font-semibold">{shift.employee_name}</p>
                  <p>{formatShiftTime(shift.start_time, shift.end_time)}</p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditShift(shift)}
                    className="bg-yellow-500 text-white px-3 py-2 rounded-lg hover:bg-yellow-600 transition"
                  >
                    Bearbeiten
                  </button>

                  <button
                    onClick={() => handleDeleteShift(shift.id)}
                    className="bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 transition"
                  >
                    Löschen
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">
            Für heute sind keine Schichten eingetragen.
          </p>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <div>
            <h2 className="text-2xl font-semibold text-blue-950">
              Wochenübersicht
            </h2>

            <p className="text-gray-500 mt-1">
              {weekStartText} bis {weekEndText}
            </p>
          </div>

          <div className="flex flex-col md:flex-row gap-2">
            <button
              onClick={goToPreviousWeek}
              className="bg-gray-200 text-blue-950 px-4 py-2 rounded-lg hover:bg-gray-300 transition"
            >
              Vorherige Woche
            </button>

            <button
              onClick={goToCurrentWeek}
              className="bg-blue-950 text-white px-4 py-2 rounded-lg hover:bg-blue-900 transition"
            >
              Aktuelle Woche
            </button>

            <button
              onClick={goToNextWeek}
              className="bg-gray-200 text-blue-950 px-4 py-2 rounded-lg hover:bg-gray-300 transition"
            >
              Nächste Woche
            </button>

            <button
              onClick={handleCopyWeekToNext}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
>
                Woche → nächste kopieren
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b text-gray-600">
                <th className="py-3 px-3">Mitarbeiter</th>

                {weekDays.map((day) => (
                  <th
                    key={day.date}
                    className={`py-3 px-3 ${
                      day.date === todayDate ? "bg-blue-50 text-blue-950" : ""
                    }`}
                  >
                    <div>{day.label}</div>
                    <div className="text-sm font-normal">{day.displayDate}</div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {employees.map((employee) => (
                <tr key={employee.id} className="border-b">
                  <td className="py-4 px-3 font-semibold text-black">
                    {employee.name}
                  </td>

                  {weekDays.map((day) => {
                    const shiftForDay = shifts.find(
                      (shift) =>
                        shift.employee_id === employee.id &&
                        shift.shift_date === day.date
                    );

                    return (
                      <td
                        key={day.date}
                        className={`py-4 px-3 text-black align-top ${
                          day.date === todayDate ? "bg-blue-50" : ""
                        }`}
                      >
                        {shiftForDay ? (
                          <div className="flex flex-col gap-2">
                            <span className="bg-blue-100 text-blue-950 px-3 py-2 rounded-lg inline-block">
                              {formatShiftTime(
                                shiftForDay.start_time,
                                shiftForDay.end_time
                              )}
                            </span>

                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEditShift(shiftForDay)}
                                className="bg-yellow-500 text-white px-2 py-1 rounded text-sm hover:bg-yellow-600 transition"
                              >
                                Bearbeiten
                              </button>

                              <button
                                onClick={() =>
                                  handleDeleteShift(shiftForDay.id)
                                }
                                className="bg-red-600 text-white px-2 py-1 rounded text-sm hover:bg-red-700 transition"
                              >
                                Löschen
                              </button>
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400">Frei</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}