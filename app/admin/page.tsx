"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getBusinessId } from "@/lib/getBusinessId";

type Employee = {
  id: string;
  name: string;
  status: string;
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

export default function AdminPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [myShifts, setMyShifts] = useState<Shift[]>([]);
  const [adminEmployeeId, setAdminEmployeeId] = useState("");

  async function loadAdminProfile() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("employee_id")
      .eq("id", user.id)
      .single();

    if (error) {
      console.error(error);
      return;
    }

    if (data?.employee_id) {
      setAdminEmployeeId(data.employee_id);
      await loadMyShifts(data.employee_id);
    }
  }

  async function loadEmployees() {
    const businessId = await getBusinessId();

    if (!businessId) return;

    const { data, error } = await supabase
      .from("employees")
      .select("id, name, status, account_status")
      .eq("business_id", businessId)
      .eq("account_status", "active");

    if (error) {
      console.error(error);
      return;
    }

    setEmployees(data || []);
  }

  async function loadShifts() {
    const businessId = await getBusinessId();

    if (!businessId) return;

    const today = new Date().toLocaleDateString("en-CA");

    const { data, error } = await supabase
      .from("shifts")
      .select("*")
      .eq("business_id", businessId)
      .eq("shift_date", today)
      .order("start_time", { ascending: true });

    if (error) {
      console.error(error);
      return;
    }

    setShifts(data || []);
  }

  async function loadMyShifts(employeeId: string) {
    const businessId = await getBusinessId();

    if (!businessId) return;

    const today = new Date().toLocaleDateString("en-CA");

    const { data, error } = await supabase
      .from("shifts")
      .select("*")
      .eq("business_id", businessId)
      .eq("employee_id", employeeId)
      .gte("shift_date", today)
      .order("shift_date", { ascending: true })
      .order("start_time", { ascending: true })
      .limit(5);

    if (error) {
      console.error(error);
      return;
    }

    setMyShifts(data || []);
  }

  useEffect(() => {
    loadEmployees();
    loadShifts();
    loadAdminProfile();
  }, []);

  function formatShiftDate(dateString: string) {
    return new Date(dateString).toLocaleDateString("de-DE", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  const activeEmployees = employees.filter(
    (employee) => employee.status === "checked_in"
  );

  const employeesOnBreak = employees.filter(
    (employee) => employee.status === "on_break"
  );

  return (
    <div>
      <h1 className="text-4xl font-bold text-blue-950 mb-8">
        Dashboard
      </h1>

      <div className="bg-gradient-to-r from-blue-950 to-blue-800 text-white rounded-2xl p-6 shadow mb-8">
  <h2 className="text-2xl font-bold mb-3">
    Erste Schritte mit Shiftly
  </h2>

  <p className="text-blue-100 mb-5">
    Richte deinen Betrieb ein und starte in wenigen Minuten.
  </p>

  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

    <div className="bg-white/10 rounded-xl p-4">
      ✅ Mitarbeiter anlegen
    </div>

    <div className="bg-white/10 rounded-xl p-4">
      ✅ Schichtvorlagen erstellen
    </div>

    <div className="bg-white/10 rounded-xl p-4">
      ✅ Dienstplan erstellen
    </div>

    <div className="bg-white/10 rounded-xl p-4">
      ✅ Kiosk öffnen & testen
    </div>

    <div className="bg-white/10 rounded-xl p-4">
      ✅ Arbeitszeit stempeln
    </div>

    <div className="bg-white/10 rounded-xl p-4">
      ✅ Excel-Export testen
    </div>

  </div>
</div>

      {adminEmployeeId && (
        <div className="bg-white rounded-2xl p-6 shadow mb-8">
          <h2 className="text-2xl font-bold text-blue-950 mb-4">
            Meine Schichten
          </h2>

          {myShifts.length > 0 ? (
            <div className="flex flex-col gap-3">
              {myShifts.map((shift) => (
                <div
                  key={shift.id}
                  className="bg-blue-50 rounded-xl p-4 text-black flex flex-col xl:flex-row xl:justify-between gap-2"
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
              Für dich sind keine kommenden Schichten eingetragen.
            </p>
          )}
        </div>
      )}

      <div className="bg-white rounded-2xl p-6 shadow mb-8">
        <h2 className="text-2xl font-bold text-blue-950 mb-4">
          Wer arbeitet heute?
        </h2>

        {shifts.length > 0 ? (
          <div className="flex flex-col gap-3">
            {shifts.map((shift) => (
              <div
                key={shift.id}
                className="bg-blue-50 rounded-xl p-4 text-black flex flex-col xl:flex-row xl:justify-between gap-2"
              >
                <span className="font-semibold">
                  {shift.employee_name}
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
            Für heute sind keine Schichten eingetragen.
          </p>
        )}
      </div>

      <div className="bg-white rounded-2xl p-6 shadow mb-8">
        <h2 className="text-xl font-semibold text-blue-950 mb-2">
          Aktive Konten
        </h2>

        <p className="text-4xl font-bold text-blue-950">
          {employees.length}
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow">
          <h2 className="text-2xl font-bold text-green-700 mb-4">
            Aktiv arbeitend
          </h2>

          {activeEmployees.length > 0 ? (
            <div className="flex flex-col gap-3">
              {activeEmployees.map((employee) => (
                <div
                  key={employee.id}
                  className="bg-green-100 text-green-800 rounded-xl p-4 font-semibold"
                >
                  {employee.name}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">
              Aktuell arbeitet niemand.
            </p>
          )}
        </div>

        <div className="bg-white rounded-2xl p-6 shadow">
          <h2 className="text-2xl font-bold text-yellow-600 mb-4">
            In Pause
          </h2>

          {employeesOnBreak.length > 0 ? (
            <div className="flex flex-col gap-3">
              {employeesOnBreak.map((employee) => (
                <div
                  key={employee.id}
                  className="bg-yellow-100 text-yellow-800 rounded-xl p-4 font-semibold"
                >
                  {employee.name}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">
              Aktuell ist niemand in Pause.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}