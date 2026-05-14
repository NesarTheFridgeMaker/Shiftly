"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getBusinessId } from "@/lib/getBusinessId";
import { getBusiness } from "@/lib/getBusiness";

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

type TimeEntry = {
  id: string;
  employee_id: string;
  employee_name: string;
  action: string;
  created_at: string;
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

type Profile = {
  id: string;
  role: string;
  business_id: string;
  employee_id: string;
};

function formatShiftDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatAbsenceType(type: string) {
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

function getRequestStatusColor(status: string) {
  if (status === "pending") return "text-yellow-600";
  if (status === "approved") return "text-green-600";
  if (status === "rejected") return "text-red-600";
  return "text-black";
}

function formatMinutes(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours <= 0) {
    return `${minutes} Min.`;
  }

  return `${hours} Std. ${minutes} Min.`;
}

function isSameDay(dateA: Date, dateB: Date) {
  return dateA.toDateString() === dateB.toDateString();
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

function calculateWorkedMinutes(entries: TimeEntry[]) {
  const groups: Record<string, TimeEntry[]> = {};

  entries.forEach((entry) => {
    const date = new Date(entry.created_at).toLocaleDateString("de-DE");
    const key = `${entry.employee_id}-${date}`;

    if (!groups[key]) {
      groups[key] = [];
    }

    groups[key].push(entry);
  });

  let totalMinutes = 0;

  Object.values(groups).forEach((groupEntries) => {
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

    if (!checkIn || !checkOut) return;

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

    const start = new Date(checkIn.created_at);
    const end = new Date(checkOut.created_at);

    const workMinutes =
      Math.round((end.getTime() - start.getTime()) / 60000) -
      pauseMinutes;

    totalMinutes += workMinutes;
  });

  return totalMinutes;
}

export default function EmployeePage() {
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [employeeId, setEmployeeId] = useState("");
  const [businessName, setBusinessName] = useState("");

  const [shifts, setShifts] = useState<Shift[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [absences, setAbsences] = useState<Absence[]>([]);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  async function loadBusinessName() {
    const business = await getBusiness();

    if (!business) return;

    setBusinessName(business.name);
  }

  async function loadEmployeeProfile() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/login";
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, role, business_id, employee_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      console.error(profileError);
      alert("Kein Profil gefunden.");
      window.location.href = "/login";
      return;
    }

    const typedProfile = profile as Profile;

    if (typedProfile.role !== "employee") {
      alert("Dieser Bereich ist nur für Mitarbeiter.");
      window.location.href = "/admin";
      return;
    }

    if (!typedProfile.employee_id) {
      alert("Diesem Benutzer ist kein Mitarbeiter zugeordnet.");
      window.location.href = "/login";
      return;
    }

    const { data: employeeData, error: employeeError } = await supabase
      .from("employees")
      .select("id, name, account_status")
      .eq("id", typedProfile.employee_id)
      .eq("business_id", typedProfile.business_id)
      .single();

    if (employeeError || !employeeData) {
      console.error(employeeError);
      alert("Mitarbeiter konnte nicht geladen werden.");
      window.location.href = "/login";
      return;
    }

    setEmployee(employeeData as Employee);
    setEmployeeId(typedProfile.employee_id);

    await loadBusinessName();
    await loadShifts(typedProfile.employee_id);
    await loadTimeEntries(typedProfile.employee_id);
    await loadAbsences(typedProfile.employee_id);

    setCheckingAuth(false);
  }

  async function loadShifts(selectedEmployeeId: string) {
    const businessId = await getBusinessId();

    if (!businessId) return;

    const { data, error } = await supabase
      .from("shifts")
      .select("*")
      .eq("business_id", businessId)
      .eq("employee_id", selectedEmployeeId)
      .order("shift_date", { ascending: true });

    if (error) {
      console.error(error);
      return;
    }

    setShifts(data || []);
  }

  async function loadTimeEntries(selectedEmployeeId: string) {
    const businessId = await getBusinessId();

    if (!businessId) return;

    const { data, error } = await supabase
      .from("time_entries")
      .select("*")
      .eq("business_id", businessId)
      .eq("employee_id", selectedEmployeeId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error(error);
      return;
    }

    setTimeEntries(data || []);
  }

  async function loadAbsences(selectedEmployeeId: string) {
    const businessId = await getBusinessId();

    if (!businessId) return;

    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const sixtyDaysAgoString = sixtyDaysAgo.toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("absences")
      .select("*")
      .eq("business_id", businessId)
      .eq("employee_id", selectedEmployeeId)
      .or(`request_status.eq.pending,start_date.gte.${sixtyDaysAgoString}`)
      .order("start_date", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    setAbsences(data || []);
  }

  useEffect(() => {
    loadEmployeeProfile();
  }, []);

  async function handleVacationRequest() {
    if (!employee || !employeeId || !startDate || !endDate) {
      alert("Bitte Von-Datum und Bis-Datum auswählen.");
      return;
    }

    const businessId = await getBusinessId();

    if (!businessId) {
      alert("Keine Business-ID gefunden.");
      return;
    }

    const { error } = await supabase.from("absences").insert([
      {
        employee_id: employee.id,
        employee_name: employee.name,
        type: "vacation",
        start_date: startDate,
        end_date: endDate,
        request_status: "pending",
        business_id: businessId,
      },
    ]);

    if (error) {
      console.error(error);
      alert(JSON.stringify(error, null, 2));
      return;
    }

    setStartDate("");
    setEndDate("");

    await loadAbsences(employeeId);

    alert("Dein Urlaubsantrag wurde gesendet.");
  }

  const today = new Date();

  const todayEntries = timeEntries.filter((entry) =>
    isSameDay(new Date(entry.created_at), today)
  );

  const weeklyEntries = timeEntries.filter((entry) => {
    const entryDate = new Date(entry.created_at);

    return (
      entryDate.getFullYear() === today.getFullYear() &&
      getWeekNumber(entryDate) === getWeekNumber(today)
    );
  });

  const monthlyEntries = timeEntries.filter((entry) => {
    const entryDate = new Date(entry.created_at);

    return (
      entryDate.getFullYear() === today.getFullYear() &&
      entryDate.getMonth() === today.getMonth()
    );
  });

  const todayMinutes = calculateWorkedMinutes(todayEntries);
  const weeklyMinutes = calculateWorkedMinutes(weeklyEntries);
  const monthlyMinutes = calculateWorkedMinutes(monthlyEntries);

  if (checkingAuth) {
    return (
      <main className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-blue-950 font-semibold">
          Mitarbeiterbereich wird geladen...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-4 md:p-10">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl md:text-4xl font-bold text-blue-950">
            Mitarbeiterbereich
          </h1>

          {businessName && (
            <p className="text-lg font-semibold text-blue-700 mt-2">
              {businessName}
            </p>
          )}

          {employee && (
            <p className="text-gray-500 mt-1">
              Eingeloggt als {employee.name}
            </p>
          )}
        </div>

        <h2 className="text-2xl font-semibold text-blue-950 mb-4">
          Stundenkonto
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-2xl shadow p-4">
            <p className="text-gray-500 mb-1">Heute</p>
            <p className="text-2xl font-bold text-green-700">
              {formatMinutes(todayMinutes)}
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow p-4">
            <p className="text-gray-500 mb-1">Diese Woche</p>
            <p className="text-2xl font-bold text-green-700">
              {formatMinutes(weeklyMinutes)}
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow p-4">
            <p className="text-gray-500 mb-1">Dieser Monat</p>
            <p className="text-2xl font-bold text-green-700">
              {formatMinutes(monthlyMinutes)}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow p-4 md:p-6 mb-6">
          <h2 className="text-2xl font-semibold text-blue-950 mb-4">
            Meine Schichten
          </h2>

          {shifts.length > 0 ? (
            <div className="flex flex-col gap-3">
              {shifts.map((shift) => (
                <div
                  key={shift.id}
                  className="bg-blue-50 rounded-xl p-4 text-black flex flex-col md:flex-row md:justify-between gap-2"
                >
                  <span className="font-semibold">
                    {formatShiftDate(shift.shift_date)}
                  </span>

                  <span>
                    {shift.start_time.slice(0, 5)} -{" "}
                    {shift.end_time.slice(0, 5)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">
              Für dich sind noch keine Schichten eingetragen.
            </p>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow p-4 md:p-6 mb-6">
          <h2 className="text-2xl font-semibold text-blue-950 mb-4">
            Meine Urlaubsanträge
          </h2>

          {absences.length > 0 ? (
            <div className="flex flex-col gap-3">
              {absences.map((absence) => (
                <div
                  key={absence.id}
                  className="bg-gray-50 rounded-xl p-4 border"
                >
                  <div className="flex flex-col md:flex-row md:justify-between gap-2">
                    <div>
                      <p className="font-semibold text-blue-950">
                        {formatAbsenceType(absence.type)}
                      </p>

                      <p className="text-sm text-gray-500">
                        {absence.start_date} bis {absence.end_date}
                      </p>
                    </div>

                    <p
                      className={`font-bold ${getRequestStatusColor(
                        absence.request_status
                      )}`}
                    >
                      {formatRequestStatus(absence.request_status)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">
              Du hast noch keine Urlaubsanträge gestellt.
            </p>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow p-4 md:p-6">
          <h2 className="text-2xl font-semibold text-blue-950 mb-4">
            Urlaub beantragen
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
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
            onClick={handleVacationRequest}
            className="w-full md:w-auto bg-blue-950 text-white px-5 py-3 rounded-xl hover:bg-blue-900 transition"
          >
            Urlaubsantrag senden
          </button>
        </div>
      </div>
    </main>
  );
}