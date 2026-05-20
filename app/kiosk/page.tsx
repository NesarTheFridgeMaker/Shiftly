"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getBusinessId } from "@/lib/getBusinessId";
import { getBusiness } from "@/lib/getBusiness";

type EmployeeStatus = "not_checked_in" | "checked_in" | "on_break";

type Employee = {
  id: string;
  name: string;
  pin: string;
  status: EmployeeStatus;
};

const MAX_FAILED_ATTEMPTS = 3;
const LOCK_DURATION_MS = 2 * 60 * 1000;

export default function KioskPage() {
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [pin, setPin] = useState("");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [message, setMessage] = useState("");
  const [showPopup, setShowPopup] = useState(false);
  const [businessName, setBusinessName] = useState("");

  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(Date.now());

  async function checkKioskAccess() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/login";
      return;
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (error || !profile) {
      console.error(error);
      window.location.href = "/login";
      return;
    }

    if (profile.role !== "admin") {
      window.location.href = "/employee";
      return;
    }

    const business = await getBusiness();

    if (!business) {
      await supabase.auth.signOut();
      window.location.href = "/login";
      return;
    }

    if (business.status === "suspended") {
      window.location.href = "/account-suspended";
      return;
    }

    setBusinessName(business.name);

    await loadEmployees();

    setCheckingAuth(false);
  }

  async function loadEmployees() {
    const businessId = await getBusinessId();

    if (!businessId) {
      console.error("Keine Business-ID gefunden.");
      return;
    }

    const { data, error } = await supabase
      .from("employees")
      .select("id, name, pin, status")
      .eq("business_id", businessId)
      .eq("account_status", "active");

    if (error) {
      console.error(error);
      return;
    }

    setEmployees((data || []) as Employee[]);
  }

  useEffect(() => {
    checkKioskAccess();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (lockedUntil && currentTime >= lockedUntil) {
      setLockedUntil(null);
      setFailedAttempts(0);
    }
  }, [currentTime, lockedUntil]);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel>;

    async function setupRealtime() {
      const businessId = await getBusinessId();

      if (!businessId) return;

      channel = supabase
        .channel(`kiosk-live-${businessId}`)

        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "employees",
            filter: `business_id=eq.${businessId}`,
          },
          async () => {
            await loadEmployees();
          }
        )

        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "businesses",
            filter: `id=eq.${businessId}`,
          },
          async () => {
            const { data } = await supabase
              .from("businesses")
              .select("status")
              .eq("id", businessId)
              .single();

            if (data?.status === "suspended") {
              await supabase.auth.signOut();

              alert("Der Zugriff auf diesen Betrieb wurde gesperrt.");

              window.location.href = "/login";
            }
          }
        )

        .subscribe();
    }

    if (!checkingAuth) {
      setupRealtime();
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [checkingAuth]);

  function showMessage(text: string) {
    setMessage(text);
    setShowPopup(true);
    setPin("");
  }

  function getRemainingLockSeconds() {
    if (!lockedUntil) return 0;

    const remainingMs = lockedUntil - currentTime;

    if (remainingMs <= 0) return 0;

    return Math.ceil(remainingMs / 1000);
  }

  function isLocked() {
    if (!lockedUntil) return false;

    return currentTime < lockedUntil;
  }

  function handleInvalidPin() {
    const nextFailedAttempts = failedAttempts + 1;

    if (nextFailedAttempts >= MAX_FAILED_ATTEMPTS) {
      setFailedAttempts(0);
      setLockedUntil(Date.now() + LOCK_DURATION_MS);
      showMessage(
        "Zu viele falsche PIN-Eingaben. Das Terminal ist für 2 Minuten gesperrt."
      );
      return;
    }

    setFailedAttempts(nextFailedAttempts);

    const remainingAttempts = MAX_FAILED_ATTEMPTS - nextFailedAttempts;

    showMessage(
      `Dieser PIN ist keinem Mitarbeiter zugeordnet. Verbleibende Versuche: ${remainingAttempts}`
    );
  }

  function getEmployeeByPinOrHandleFailure() {
    if (isLocked()) {
      const remainingSeconds = getRemainingLockSeconds();

      showMessage(
        `Terminal gesperrt. Bitte in ${remainingSeconds} Sekunden erneut versuchen.`
      );

      return null;
    }

    const employee = employees.find((employee) => employee.pin === pin);

    if (!employee) {
      handleInvalidPin();
      return null;
    }

    setFailedAttempts(0);
    setLockedUntil(null);

    return employee;
  }

  async function updateEmployeeStatus(
    employee: Employee,
    newStatus: EmployeeStatus
  ) {
    const businessId = await getBusinessId();

    if (!businessId) {
      showMessage("Keine Business-ID gefunden.");
      return false;
    }

    const { error } = await supabase
      .from("employees")
      .update({ status: newStatus })
      .eq("id", employee.id)
      .eq("business_id", businessId);

    if (error) {
      console.error(error);
      showMessage("Fehler beim Speichern.");
      return false;
    }

    await loadEmployees();
    return true;
  }

  async function createTimeEntry(employee: Employee, action: string) {
    const businessId = await getBusinessId();

    if (!businessId) {
      showMessage("Keine Business-ID gefunden.");
      return false;
    }

    const { error } = await supabase.from("time_entries").insert([
      {
        employee_id: employee.id,
        employee_name: employee.name,
        action,
        business_id: businessId,
      },
    ]);

    if (error) {
      console.error(error);
      showMessage("Stempelschritt konnte nicht gespeichert werden.");
      return false;
    }

    return true;
  }

  async function handleCheckIn() {
    const employee = getEmployeeByPinOrHandleFailure();

    if (!employee) return;

    if (employee.status === "checked_in") {
      showMessage(`${employee.name} ist bereits eingestempelt.`);
      return;
    }

    if (employee.status === "on_break") {
      showMessage(`${employee.name} ist aktuell in der Pause.`);
      return;
    }

    const statusUpdated = await updateEmployeeStatus(employee, "checked_in");
    if (!statusUpdated) return;

    const entryCreated = await createTimeEntry(employee, "check_in");
    if (!entryCreated) return;

    showMessage(`${employee.name} ist jetzt eingestempelt.`);
  }

  async function handleStartBreak() {
    const employee = getEmployeeByPinOrHandleFailure();

    if (!employee) return;

    if (employee.status === "not_checked_in") {
      showMessage("Du hast vergessen dich einzustempeln.");
      return;
    }

    if (employee.status === "on_break") {
      showMessage(`${employee.name} ist bereits in der Pause.`);
      return;
    }

    const statusUpdated = await updateEmployeeStatus(employee, "on_break");
    if (!statusUpdated) return;

    const entryCreated = await createTimeEntry(employee, "break_start");
    if (!entryCreated) return;

    showMessage(`${employee.name} ist jetzt in der Pause.`);
  }

  async function handleEndBreak() {
    const employee = getEmployeeByPinOrHandleFailure();

    if (!employee) return;

    if (employee.status !== "on_break") {
      showMessage("Du hast keinen Pausenbeginn gestempelt.");
      return;
    }

    const statusUpdated = await updateEmployeeStatus(employee, "checked_in");
    if (!statusUpdated) return;

    const entryCreated = await createTimeEntry(employee, "break_end");
    if (!entryCreated) return;

    showMessage(`${employee.name} arbeitet jetzt weiter.`);
  }

  async function handleCheckOut() {
    const employee = getEmployeeByPinOrHandleFailure();

    if (!employee) return;

    if (employee.status === "not_checked_in") {
      showMessage("Du hast vergessen dich einzustempeln.");
      return;
    }

    const statusUpdated = await updateEmployeeStatus(
      employee,
      "not_checked_in"
    );
    if (!statusUpdated) return;

    const entryCreated = await createTimeEntry(employee, "check_out");
    if (!entryCreated) return;

    showMessage(`${employee.name} ist jetzt ausgestempelt.`);
  }

  const activeEmployees = employees.filter(
    (employee) => employee.status === "checked_in"
  );

  const employeesOnBreak = employees.filter(
    (employee) => employee.status === "on_break"
  );

  const locked = isLocked();
  const remainingLockSeconds = getRemainingLockSeconds();

  if (checkingAuth) {
    return (
      <main className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-blue-950 font-semibold">Kiosk wird geprüft...</p>
      </main>
    );
  }

  return (
    <main className="h-screen bg-gray-100 p-3 md:p-5 overflow-hidden">
      <div className="h-full grid grid-cols-1 xl:grid-cols-3 gap-4">
        <section className="xl:col-span-2 bg-white rounded-3xl shadow-xl p-4 md:p-6 flex flex-col justify-center min-h-0">
          <div>
<div className="flex justify-center mb-6">
  <img
    src="/logo/dipera-logo.png"
    alt="Dipera"
    className="w-56 h-auto"
  />
</div>

            {locked ? (
              <div className="bg-red-100 text-red-700 p-3 rounded-2xl text-center font-bold mb-4">
                Terminal gesperrt. Bitte in {remainingLockSeconds} Sekunden
                erneut versuchen.
              </div>
            ) : (
              <p className="text-center text-gray-500 mb-4">
                PIN eingeben und Stempelschritt auswählen
              </p>
            )}

            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              placeholder="4-stellige PIN"
              value={pin}
              onChange={(event) => {
                const onlyNumbers = event.target.value.replace(/\D/g, "");
                setPin(onlyNumbers);
              }}
              disabled={locked}
              className="w-full border p-3 rounded-2xl text-3xl bg-white text-black text-center mb-3 disabled:bg-gray-200 disabled:cursor-not-allowed"
            />

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleCheckIn}
                disabled={locked}
                className="bg-green-600 text-white py-4 rounded-2xl text-xl md:text-2xl font-semibold hover:bg-green-700 transition hover:scale-105 disabled:bg-gray-400 disabled:hover:scale-100"
              >
                Einstempeln
              </button>

              <button
                onClick={handleStartBreak}
                disabled={locked}
                className="bg-yellow-500 text-white py-4 rounded-2xl text-xl md:text-2xl font-semibold hover:bg-yellow-600 transition hover:scale-105 disabled:bg-gray-400 disabled:hover:scale-100"
              >
                Pause starten
              </button>

              <button
                onClick={handleEndBreak}
                disabled={locked}
                className="bg-blue-600 text-white py-4 rounded-2xl text-xl md:text-2xl font-semibold hover:bg-blue-700 transition hover:scale-105 disabled:bg-gray-400 disabled:hover:scale-100"
              >
                Pause beenden
              </button>

              <button
                onClick={handleCheckOut}
                disabled={locked}
                className="bg-red-600 text-white py-4 rounded-2xl text-xl md:text-2xl font-semibold hover:bg-red-700 transition hover:scale-105 disabled:bg-gray-400 disabled:hover:scale-100"
              >
                Ausstempeln
              </button>
            </div>
          </div>
        </section>

        <aside className="hidden xl:block bg-white rounded-3xl shadow-xl p-4 md:p-6 min-h-0 overflow-hidden">
          <h2 className="text-2xl font-bold text-blue-950 mb-4">
            Live-Status
          </h2>

          <div className="mb-5">
            <h3 className="text-lg font-semibold text-green-700 mb-2">
              Aktiv arbeitend
            </h3>

            {activeEmployees.length > 0 ? (
              <div className="flex flex-col gap-2 max-h-32 overflow-y-auto">
                {activeEmployees.map((employee) => (
                  <div
                    key={employee.id}
                    className="bg-green-100 text-green-800 rounded-xl p-3 font-medium"
                  >
                    {employee.name}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400">Niemand aktiv.</p>
            )}
          </div>

          <div>
            <h3 className="text-lg font-semibold text-yellow-700 mb-2">
              In Pause
            </h3>

            {employeesOnBreak.length > 0 ? (
              <div className="flex flex-col gap-2 max-h-32 overflow-y-auto">
                {employeesOnBreak.map((employee) => (
                  <div
                    key={employee.id}
                    className="bg-yellow-100 text-yellow-800 rounded-xl p-3 font-medium"
                  >
                    {employee.name}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400">Niemand in Pause.</p>
            )}
          </div>
        </aside>
      </div>

      {showPopup && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl shadow-2xl p-6 md:p-8 max-w-lg w-full text-center">
            <p className="text-2xl md:text-3xl font-bold text-blue-950 mb-6">
              {message}
            </p>

            <button
              onClick={() => setShowPopup(false)}
              className="bg-blue-950 text-white px-10 py-4 rounded-2xl text-xl font-semibold hover:bg-blue-900 transition hover:scale-105"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </main>
  );
}