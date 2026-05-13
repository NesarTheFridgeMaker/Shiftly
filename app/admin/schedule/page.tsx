"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

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

export default function SchedulePage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [absences, setAbsences] = useState<Absence[]>([]);
const [warning, setWarning] = useState("");

  const [employeeId, setEmployeeId] = useState("");
  const [date, setDate] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  async function loadEmployees() {
    const { data, error } = await supabase
      .from("employees")
      .select("id, name, account_status")
      .eq("account_status", "active")
      .order("name", { ascending: true });

    if (error) {
      console.error(error);
      return;
    }

    setEmployees(data);
  }

  async function loadShifts() {
    const { data, error } = await supabase
      .from("shifts")
      .select("*")
      .order("shift_date", { ascending: true });

    if (error) {
      console.error(error);
      return;
    }

    setShifts(data);
  }

  async function loadAbsences() {
  const { data, error } = await supabase
    .from("absences")
    .select("id, employee_id, type, start_date, end_date, request_status")
    .eq("request_status", "approved");

  if (error) {
    console.error(error);
    return;
  }

  setAbsences(data);
}

useEffect(() => {
  loadEmployees();
  loadShifts();
  loadAbsences();
}, []);

  async function handleAddShift() {
    if (!employeeId || !date || !start || !end) return;

    const selectedEmployee = employees.find(
      (employee) => employee.id === employeeId
    );

    if (!selectedEmployee) return;
    const absenceForShift = findAbsenceForShift(
  selectedEmployee.id,
  date
);

if (absenceForShift) {
  setWarning(
    `Achtung: ${selectedEmployee.name} ist an diesem Tag als ${formatAbsenceType(
      absenceForShift.type
    )} eingetragen. Die Schicht wurde trotzdem gespeichert.`
  );
} else {
  setWarning("");
}

    const { error } = await supabase.from("shifts").insert([
      {
        employee_id: selectedEmployee.id,
        employee_name: selectedEmployee.name,
        shift_date: date,
        start_time: start,
        end_time: end,
      },
    ]);

    if (error) {
      console.error(error);
      return;
    }

    setDate("");
    setStart("");
    setEnd("");
    setEmployeeId("");

    loadShifts();
  }

  function getTodayDate() {
    return new Date().toISOString().split("T")[0];
  }

  function formatAbsenceType(type: string) {
  if (type === "vacation") return "Urlaub";
  if (type === "sick") return "Krankheit";
  return type;
}

function findAbsenceForShift(employeeId: string, shiftDate: string) {
  return absences.find(
    (absence) =>
      absence.employee_id === employeeId &&
      shiftDate >= absence.start_date &&
      shiftDate <= absence.end_date
  );
}

  const todaysShifts = shifts.filter(
    (shift) => shift.shift_date === getTodayDate()
  );

  const weekDays = [
    { label: "Montag", date: "2026-05-11" },
    { label: "Dienstag", date: "2026-05-12" },
    { label: "Mittwoch", date: "2026-05-13" },
    { label: "Donnerstag", date: "2026-05-14" },
    { label: "Freitag", date: "2026-05-15" },
    { label: "Samstag", date: "2026-05-16" },
    { label: "Sonntag", date: "2026-05-17" },
  ];

  return (
    <div>
      <h1 className="text-4xl font-bold text-blue-950 mb-8">
        Dienstplan
      </h1>

      <div className="bg-white rounded-2xl shadow p-6 mb-8">
        <h2 className="text-2xl font-semibold text-blue-950 mb-4">
          Neue Schicht eintragen
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
          </div>
        </div>

        <button
          onClick={handleAddShift}
          className="mt-5 bg-blue-950 text-white px-5 py-3 rounded-xl cursor-pointer hover:bg-blue-900 hover:scale-105 transition"
        >
          Schicht speichern
        </button>
      </div>

      {warning && (
  <div className="mt-5 bg-yellow-100 text-yellow-800 p-4 rounded-xl font-semibold">
    {warning}
  </div>
)}

      <div className="bg-white rounded-2xl shadow p-6 mb-8">
        <h2 className="text-2xl font-semibold text-blue-950 mb-4">
          Wer arbeitet heute?
        </h2>

        {todaysShifts.length > 0 ? (
          <div className="flex flex-col gap-3">
            {todaysShifts.map((shift) => (
              <div
                key={shift.id}
                className="bg-blue-50 rounded-xl p-4 text-black flex justify-between"
              >
                <span className="font-semibold">{shift.employee_name}</span>
                <span>
                  {shift.start_time.slice(0, 5)} -{" "}
                  {shift.end_time.slice(0, 5)}
                </span>
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
        <h2 className="text-2xl font-semibold text-blue-950 mb-4">
          Wochenübersicht
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b text-gray-600">
                <th className="py-3 px-3">Mitarbeiter</th>

                {weekDays.map((day) => (
                  <th key={day.date} className="py-3 px-3">
                    {day.label}
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
                      <td key={day.date} className="py-4 px-3 text-black">
                        {shiftForDay ? (
                          <span className="bg-blue-100 text-blue-950 px-3 py-2 rounded-lg inline-block">
                            {shiftForDay.start_time.slice(0, 5)} -{" "}
                            {shiftForDay.end_time.slice(0, 5)}
                          </span>
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