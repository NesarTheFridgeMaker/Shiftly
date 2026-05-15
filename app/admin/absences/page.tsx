"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getBusinessId } from "@/lib/getBusinessId";

type Employee = {
  id: string;
  name: string;
  account_status: string;
};

type Absence = {
  id: string;
  employee_id: string;
  employee_name: string;
  type: string;
  start_date: string;
  end_date: string;
  request_status: string;
};

function formatType(type: string) {
  if (type === "vacation") return "Urlaub";
  if (type === "sick") return "Krankheit";
  return type;
}

function formatRequestStatus(status: string) {
  if (status === "pending") return "Offen";
  if (status === "approved") return "Genehmigt";
  if (status === "rejected") return "Abgelehnt";
  return status;
}

function getStatusColor(status: string) {
  if (status === "pending") return "text-yellow-600";
  if (status === "approved") return "text-green-600";
  if (status === "rejected") return "text-red-600";
  return "text-black";
}

function getTypeBadgeClasses(type: string) {
  if (type === "vacation") return "bg-blue-100 text-blue-800";
  if (type === "sick") return "bg-red-100 text-red-700";
  return "bg-gray-100 text-gray-700";
}

export default function AbsencesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [absences, setAbsences] = useState<Absence[]>([]);

  const [employeeId, setEmployeeId] = useState("");
  const [type, setType] = useState("vacation");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

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

  async function loadAbsences() {
    const businessId = await getBusinessId();

    if (!businessId) {
      console.error("Keine Business-ID gefunden.");
      return;
    }

    const { data, error } = await supabase
      .from("absences")
      .select("*")
      .eq("business_id", businessId)
      .order("start_date", { ascending: true });

    if (error) {
      console.error(error);
      return;
    }

    setAbsences(data || []);
  }

  useEffect(() => {
    loadEmployees();
    loadAbsences();
  }, []);

  async function handleAddAbsence() {
    if (!employeeId || !startDate || !endDate) {
      alert("Bitte Mitarbeiter, Startdatum und Enddatum ausfüllen.");
      return;
    }

    if (startDate > endDate) {
  alert("Das Startdatum darf nicht nach dem Enddatum liegen.");
  return;
}

    const businessId = await getBusinessId();

    if (!businessId) {
      alert("Keine Business-ID gefunden.");
      return;
    }

    const selectedEmployee = employees.find(
      (employee) => employee.id === employeeId
    );

    if (!selectedEmployee) return;

    const overlappingAbsence = absences.find(
  (absence) =>
    absence.employee_id === employeeId &&
    absence.request_status !== "rejected" &&
    startDate <= absence.end_date &&
    endDate >= absence.start_date
);

if (overlappingAbsence) {
  alert(
    `Für diesen Mitarbeiter existiert bereits eine Abwesenheit vom ${overlappingAbsence.start_date} bis ${overlappingAbsence.end_date}.`
  );

  return;
}

    const { error } = await supabase.from("absences").insert([
      {
        employee_id: selectedEmployee.id,
        employee_name: selectedEmployee.name,
        type,
        start_date: startDate,
        end_date: endDate,
        request_status: "approved",
        business_id: businessId,
      },
    ]);

    if (error) {
      console.error(error);
      alert(JSON.stringify(error, null, 2));
      return;
    }

    setEmployeeId("");
    setType("vacation");
    setStartDate("");
    setEndDate("");

    loadAbsences();
  }

async function handleUpdateRequestStatus(id: string, newStatus: string) {
  const businessId = await getBusinessId();

  if (!businessId) {
    alert("Keine Business-ID gefunden.");
    return;
  }

  const selectedAbsence = absences.find((absence) => absence.id === id);

  if (!selectedAbsence) {
    alert("Antrag wurde nicht gefunden.");
    return;
  }

  const { error } = await supabase
    .from("absences")
    .update({ request_status: newStatus })
    .eq("id", id)
    .eq("business_id", businessId);

  if (error) {
    console.error(error);
    alert(JSON.stringify(error, null, 2));
    return;
  }

  const statusText =
    newStatus === "approved" ? "genehmigt" : "abgelehnt";

  const { error: notificationError } = await supabase
    .from("notifications")
    .insert([
      {
        business_id: businessId,
        employee_id: selectedAbsence.employee_id,
        title: "Urlaubsantrag beantwortet",
        message: `Dein Urlaubsantrag vom ${selectedAbsence.start_date} bis ${selectedAbsence.end_date} wurde ${statusText}.`,
        type: "vacation_response",
        is_read: false,
      },
    ]);

  if (notificationError) {
    console.error(notificationError);
  }

  loadAbsences();
}

  async function handleDeleteAbsence(id: string) {
    const businessId = await getBusinessId();

    if (!businessId) {
      alert("Keine Business-ID gefunden.");
      return;
    }

    const { error } = await supabase
      .from("absences")
      .delete()
      .eq("id", id)
      .eq("business_id", businessId);

    if (error) {
      console.error(error);
      alert(JSON.stringify(error, null, 2));
      return;
    }

    loadAbsences();
  }

  const pendingAbsences = absences.filter(
    (absence) => absence.request_status === "pending"
  );

  const otherAbsences = absences.filter(
    (absence) => absence.request_status !== "pending"
  );

  return (
    <div>
      <h1 className="text-3xl md:text-4xl font-bold text-blue-950 mb-6 md:mb-8">
        Abwesenheiten
      </h1>

      <div className="bg-white rounded-2xl shadow p-4 md:p-6 mb-8">
        <h2 className="text-2xl font-semibold text-blue-950 mb-4">
          Abwesenheit eintragen
        </h2>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
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

          <select
            value={type}
            onChange={(event) => setType(event.target.value)}
            className="border p-3 rounded-lg bg-white text-black"
          >
            <option value="vacation">Urlaub</option>
            <option value="sick">Krankheit</option>
          </select>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-gray-600">
              Von
            </label>

            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="border p-3 rounded-lg bg-white text-black"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-gray-600">
              Bis
            </label>

            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="border p-3 rounded-lg bg-white text-black"
            />
          </div>
        </div>

        <button
          onClick={handleAddAbsence}
          className="w-full xl:w-auto mt-5 bg-blue-950 text-white px-5 py-3 rounded-xl cursor-pointer hover:bg-blue-900 hover:scale-105 transition"
        >
          Abwesenheit speichern
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow p-4 md:p-6 mb-8">
        <h2 className="text-2xl font-semibold text-blue-950 mb-4">
          Offene Anträge
        </h2>

        {pendingAbsences.length > 0 ? (
          <>
            <div className="xl:hidden flex flex-col gap-4">
              {pendingAbsences.map((absence) => (
                <div
                  key={absence.id}
                  className="bg-gray-50 rounded-2xl p-4 border shadow-sm"
                >
                  <div className="flex justify-between items-start gap-3 mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-blue-950">
                        {absence.employee_name}
                      </h3>

                      <p className="text-sm text-gray-500">
                        {absence.start_date} bis {absence.end_date}
                      </p>
                    </div>

                    <span
                      className={`px-3 py-1 rounded-full text-sm font-semibold ${getTypeBadgeClasses(
                        absence.type
                      )}`}
                    >
                      {formatType(absence.type)}
                    </span>
                  </div>

                  <p className="font-bold text-yellow-600 mb-4">
                    Offen
                  </p>

                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() =>
                        handleUpdateRequestStatus(absence.id, "approved")
                      }
                      className="w-full bg-green-600 text-white px-3 py-3 rounded-lg hover:bg-green-700 transition"
                    >
                      Genehmigen
                    </button>

                    <button
                      onClick={() =>
                        handleUpdateRequestStatus(absence.id, "rejected")
                      }
                      className="w-full bg-red-600 text-white px-3 py-3 rounded-lg hover:bg-red-700 transition"
                    >
                      Ablehnen
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden xl:block overflow-x-auto max-w-full">
              <table className="min-w-[800px] w-full text-left">
                <thead>
                  <tr className="border-b text-gray-600">
                    <th className="py-3 px-4">Mitarbeiter</th>
                    <th className="py-3 px-4">Art</th>
                    <th className="py-3 px-4">Von</th>
                    <th className="py-3 px-4">Bis</th>
                    <th className="py-3 px-4">Aktionen</th>
                  </tr>
                </thead>

                <tbody>
                  {pendingAbsences.map((absence) => (
                    <tr key={absence.id} className="border-b">
                      <td className="py-3 px-4 text-black">
                        {absence.employee_name}
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-semibold ${getTypeBadgeClasses(
                            absence.type
                          )}`}
                        >
                          {formatType(absence.type)}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-black">
                        {absence.start_date}
                      </td>

                      <td className="py-3 px-4 text-black">
                        {absence.end_date}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex gap-3">
                          <button
                            onClick={() =>
                              handleUpdateRequestStatus(
                                absence.id,
                                "approved"
                              )
                            }
                            className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition"
                          >
                            Genehmigen
                          </button>

                          <button
                            onClick={() =>
                              handleUpdateRequestStatus(
                                absence.id,
                                "rejected"
                              )
                            }
                            className="bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 transition"
                          >
                            Ablehnen
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="text-gray-500">
            Keine offenen Anträge vorhanden.
          </p>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow p-4 md:p-6">
        <h2 className="text-2xl font-semibold text-blue-950 mb-4">
          Abwesenheitsübersicht
        </h2>

        <div className="xl:hidden flex flex-col gap-4">
          {otherAbsences.map((absence) => (
            <div
              key={absence.id}
              className="bg-gray-50 rounded-2xl p-4 border shadow-sm"
            >
              <div className="flex justify-between items-start gap-3 mb-4">
                <div>
                  <h3 className="text-lg font-bold text-blue-950">
                    {absence.employee_name}
                  </h3>

                  <p className="text-sm text-gray-500">
                    {absence.start_date} bis {absence.end_date}
                  </p>
                </div>

                <span
                  className={`px-3 py-1 rounded-full text-sm font-semibold ${getTypeBadgeClasses(
                    absence.type
                  )}`}
                >
                  {formatType(absence.type)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                <div className="bg-white rounded-xl p-3">
                  <p className="text-gray-500 mb-1">Status</p>
                  <p
                    className={`font-bold ${getStatusColor(
                      absence.request_status
                    )}`}
                  >
                    {formatRequestStatus(absence.request_status)}
                  </p>
                </div>

                <div className="bg-white rounded-xl p-3">
                  <p className="text-gray-500 mb-1">Zeitraum</p>
                  <p className="font-semibold text-black">
                    {absence.start_date} - {absence.end_date}
                  </p>
                </div>
              </div>

              <button
                onClick={() => handleDeleteAbsence(absence.id)}
                className="w-full bg-red-600 text-white px-3 py-3 rounded-lg hover:bg-red-700 transition"
              >
                Löschen
              </button>
            </div>
          ))}
        </div>

        <div className="hidden xl:block overflow-x-auto max-w-full">
          <table className="min-w-[800px] w-full text-left">
            <thead>
              <tr className="border-b text-gray-600">
                <th className="py-3 px-4">Mitarbeiter</th>
                <th className="py-3 px-4">Art</th>
                <th className="py-3 px-4">Von</th>
                <th className="py-3 px-4">Bis</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Aktionen</th>
              </tr>
            </thead>

            <tbody>
              {otherAbsences.map((absence) => (
                <tr key={absence.id} className="border-b">
                  <td className="py-3 px-4 text-black">
                    {absence.employee_name}
                  </td>

                  <td className="py-3 px-4">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-semibold ${getTypeBadgeClasses(
                        absence.type
                      )}`}
                    >
                      {formatType(absence.type)}
                    </span>
                  </td>

                  <td className="py-3 px-4 text-black">
                    {absence.start_date}
                  </td>

                  <td className="py-3 px-4 text-black">
                    {absence.end_date}
                  </td>

                  <td
                    className={`py-3 px-4 font-bold ${getStatusColor(
                      absence.request_status
                    )}`}
                  >
                    {formatRequestStatus(absence.request_status)}
                  </td>

                  <td className="py-3 px-4">
                    <button
                      onClick={() => handleDeleteAbsence(absence.id)}
                      className="bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 transition"
                    >
                      Löschen
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {otherAbsences.length === 0 && (
          <p className="text-gray-500 mt-4">
            Noch keine Abwesenheiten vorhanden.
          </p>
        )}
      </div>
    </div>
  );
}