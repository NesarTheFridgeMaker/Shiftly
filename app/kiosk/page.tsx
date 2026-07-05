"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getBusinessId } from "@/lib/getBusinessId";
import { getBusiness } from "@/lib/getBusiness";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import Skeleton from "@/components/ui/Skeleton";

type EmployeeStatus = "not_checked_in" | "checked_in" | "on_break";

type Employee = {
  id: string;
  name: string;
  pin: string;
  status: EmployeeStatus;
};

type TimeEntry = {
  action: string;
  created_at: string;
};

const MAX_FAILED_ATTEMPTS = 3;
const LOCK_DURATION_MS = 2 * 60 * 1000;

export default function KioskPage() {
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pin, setPin] = useState("");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showPopup, setShowPopup] = useState(false);
  const [businessName, setBusinessName] = useState("");

  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [showAdminPopup, setShowAdminPopup] = useState(false);
  const [adminPin, setAdminPin] = useState("");
  const [popupMessage, setPopupMessage] = useState("");
  const [popupTone, setPopupTone] =
    useState<"success" | "warning" | "danger" | "info">("info");

  function showMessage(
    text: string,
    tone: "success" | "warning" | "danger" | "info" = "info"
  ) {
    setPopupMessage(text);
    setPopupTone(tone);
    setShowPopup(true);
    setPin("");
  }

  function formatClockTime(date = new Date()) {
    return date.toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatFullDate(date = new Date()) {
    return date.toLocaleDateString("de-DE", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  }

  function formatWorkedDuration(milliseconds: number) {
    const totalMinutes = Math.max(0, Math.round(milliseconds / 60000));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return `${hours}:${minutes.toString().padStart(2, "0")}`;
  }

  function getTodayRange() {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    return {
      startIso: start.toISOString(),
      endIso: end.toISOString(),
    };
  }

  function calculateWorkedMilliseconds(entries: TimeEntry[]) {
    const sortedEntries = [...entries].sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    let activeSince: Date | null = null;
    let workedMilliseconds = 0;

    for (const entry of sortedEntries) {
      const entryTime = new Date(entry.created_at);

      if (entry.action === "check_in") {
        activeSince = entryTime;
      }

      if (entry.action === "break_start" && activeSince) {
        workedMilliseconds += entryTime.getTime() - activeSince.getTime();
        activeSince = null;
      }

      if (entry.action === "break_end") {
        activeSince = entryTime;
      }

      if (entry.action === "check_out" && activeSince) {
        workedMilliseconds += entryTime.getTime() - activeSince.getTime();
        activeSince = null;
      }
    }

    return workedMilliseconds;
  }

  async function getWorkedMillisecondsToday(employeeId: string) {
    const businessId = await getBusinessId();

    if (!businessId) return null;

    const { startIso, endIso } = getTodayRange();

    const { data, error } = await supabase
      .from("time_entries")
      .select("action, created_at")
      .eq("business_id", businessId)
      .eq("employee_id", employeeId)
      .gte("created_at", startIso)
      .lt("created_at", endIso)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Worked time calculation error:", error);
      return null;
    }

    return calculateWorkedMilliseconds((data || []) as TimeEntry[]);
  }

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

    if (!["admin", "owner"].includes(profile.role)) {
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
      .eq("account_status", "active")
      .order("name", { ascending: true });

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
    if (!showPopup || popupTone !== "success") return;

    const timeout = setTimeout(() => {
      setShowPopup(false);
    }, 4500);

    return () => clearTimeout(timeout);
  }, [showPopup, popupTone, popupMessage]);

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

              showMessage("Der Zugriff auf diesen Betrieb wurde gesperrt.", "danger");

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

  async function handleReturnToAdmin() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      showMessage("Kein Admin angemeldet.", "danger");
      window.location.href = "/login";
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("admin_pin")
      .eq("id", user.id)
      .single();

    if (error || !data) {
      console.error(error);
      showMessage("Admin-PIN konnte nicht geladen werden.", "danger");
      return;
    }

    if (!data.admin_pin) {
      showMessage("Für diesen Admin wurde noch kein PIN festgelegt.", "warning");
      return;
    }

    if (adminPin !== data.admin_pin) {
      showMessage("Falsche PIN.", "danger");
      return;
    }

    setAdminPin("");
    setShowAdminPopup(false);
    window.location.href = "/admin";
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
        "Zu viele falsche PIN-Eingaben. Das Terminal ist für 2 Minuten gesperrt.",
        "danger"
      );
      return;
    }

    setFailedAttempts(nextFailedAttempts);

    const remainingAttempts = MAX_FAILED_ATTEMPTS - nextFailedAttempts;

    showMessage(
      `Dieser PIN ist keinem Mitarbeiter zugeordnet. Verbleibende Versuche: ${remainingAttempts}`,
      "warning"
    );
  }

  function getEmployeeByPinOrHandleFailure() {
    if (isLocked()) {
      const remainingSeconds = getRemainingLockSeconds();

      showMessage(
        `Terminal gesperrt. Bitte in ${remainingSeconds} Sekunden erneut versuchen.`,
        "danger"
      );

      return null;
    }

    if (pin.length < 4) {
      showMessage("Bitte gib zuerst deine 4-stellige PIN ein.", "warning");
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
      showMessage("Keine Business-ID gefunden.", "danger");
      return false;
    }

    const { error } = await supabase
      .from("employees")
      .update({ status: newStatus })
      .eq("id", employee.id)
      .eq("business_id", businessId);

    if (error) {
      console.error(error);
      showMessage("Fehler beim Speichern.", "danger");
      return false;
    }

    await loadEmployees();
    return true;
  }

  async function createTimeEntry(employee: Employee, action: string) {
    const businessId = await getBusinessId();

    if (!businessId) {
      showMessage("Keine Business-ID gefunden.", "danger");
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
      showMessage("Stempelschritt konnte nicht gespeichert werden.", "danger");
      return false;
    }

    return true;
  }

  async function handleCheckIn() {
    if (isProcessing) return;

    setIsProcessing(true);

    try {
      const employee = getEmployeeByPinOrHandleFailure();

      if (!employee) return;

      if (employee.status === "checked_in") {
        showMessage(`${employee.name} ist bereits eingestempelt.`, "warning");
        return;
      }

      if (employee.status === "on_break") {
        showMessage(`${employee.name} ist aktuell in der Pause.`, "warning");
        return;
      }

      const stampTime = new Date();

      const statusUpdated = await updateEmployeeStatus(employee, "checked_in");
      if (!statusUpdated) return;

      const entryCreated = await createTimeEntry(employee, "check_in");
      if (!entryCreated) return;

      showMessage(
        `Viel Spaß bei der Arbeit! Du hast dich um ${formatClockTime(stampTime)} Uhr eingestempelt.`,
        "success"
      );
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleStartBreak() {
    if (isProcessing) return;

    setIsProcessing(true);

    try {
      const employee = getEmployeeByPinOrHandleFailure();

      if (!employee) return;

      if (employee.status === "not_checked_in") {
        showMessage("Du hast vergessen dich einzustempeln.", "warning");
        return;
      }

      if (employee.status === "on_break") {
        showMessage(`${employee.name} ist bereits in der Pause.`, "warning");
        return;
      }

      const stampTime = new Date();

      const statusUpdated = await updateEmployeeStatus(employee, "on_break");
      if (!statusUpdated) return;

      const entryCreated = await createTimeEntry(employee, "break_start");
      if (!entryCreated) return;

      showMessage(
        `Gute Pause! Du hast deine Pause um ${formatClockTime(stampTime)} Uhr gestartet.`,
        "success"
      );
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleEndBreak() {
    if (isProcessing) return;

    setIsProcessing(true);

    try {
      const employee = getEmployeeByPinOrHandleFailure();

      if (!employee) return;

      if (employee.status !== "on_break") {
        showMessage("Du hast keinen Pausenbeginn gestempelt.", "warning");
        return;
      }

      const stampTime = new Date();

      const statusUpdated = await updateEmployeeStatus(employee, "checked_in");
      if (!statusUpdated) return;

      const entryCreated = await createTimeEntry(employee, "break_end");
      if (!entryCreated) return;

      showMessage(
        `Willkommen zurück! Du hast deine Pause um ${formatClockTime(stampTime)} Uhr beendet.`,
        "success"
      );
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleCheckOut() {
    if (isProcessing) return;

    setIsProcessing(true);

    try {
      const employee = getEmployeeByPinOrHandleFailure();

      if (!employee) return;

      if (employee.status === "not_checked_in") {
        showMessage("Du hast vergessen dich einzustempeln.", "warning");
        return;
      }

      const stampTime = new Date();

      const statusUpdated = await updateEmployeeStatus(
        employee,
        "not_checked_in"
      );
      if (!statusUpdated) return;

      const entryCreated = await createTimeEntry(employee, "check_out");
      if (!entryCreated) return;

      const workedMilliseconds = await getWorkedMillisecondsToday(employee.id);

      if (workedMilliseconds === null) {
        showMessage(
          `Schönen Feierabend! Du hast dich um ${formatClockTime(stampTime)} Uhr ausgestempelt.`,
          "success"
        );
        return;
      }

      showMessage(
        `Schönen Feierabend! Du hast dich um ${formatClockTime(stampTime)} Uhr ausgestempelt und heute insgesamt ${formatWorkedDuration(workedMilliseconds)} Stunden gearbeitet.`,
        "success"
      );
    } finally {
      setIsProcessing(false);
    }
  }

  function appendDigit(digit: string) {
    if (locked || isProcessing) return;

    setPin((currentPin) => {
      if (currentPin.length >= 4) return currentPin;
      return `${currentPin}${digit}`;
    });
  }

  const activeEmployees = employees.filter(
    (employee) => employee.status === "checked_in"
  );

  const employeesOnBreak = employees.filter(
    (employee) => employee.status === "on_break"
  );

  const locked = isLocked();
  const remainingLockSeconds = getRemainingLockSeconds();

  const pinDots = Array.from({ length: 4 }, (_, index) => pin.length > index);

  const popupStyles = {
    success: {
      icon: "✓",
      iconClass: "bg-[#DCFCE7] text-[#16A34A]",
      buttonClass: "bg-[#2563EB] text-white hover:bg-[#1D4ED8]",
    },
    warning: {
      icon: "!",
      iconClass: "bg-[#FEF3C7] text-[#B45309]",
      buttonClass: "bg-[#2563EB] text-white hover:bg-[#1D4ED8]",
    },
    danger: {
      icon: "!",
      iconClass: "bg-[#FEE2E2] text-[#EF4444]",
      buttonClass: "bg-[#EF4444] text-white hover:bg-red-600",
    },
    info: {
      icon: "i",
      iconClass: "bg-[#EFF6FF] text-[#2563EB]",
      buttonClass: "bg-[#2563EB] text-white hover:bg-[#1D4ED8]",
    },
  }[popupTone];

  if (checkingAuth) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC] p-6">
        <div className="w-full max-w-xl rounded-[32px] border border-[#E2E8F0] bg-white p-8 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
          <Skeleton className="h-10 w-44" />
          <Skeleton className="mt-8 h-12 w-72 max-w-full" />
          <Skeleton className="mt-4 h-5 w-full" />
          <Skeleton className="mt-2 h-5 w-2/3" />

          <div className="mt-8 grid grid-cols-3 gap-3">
            {Array.from({ length: 12 }).map((_, index) => (
              <Skeleton key={index} className="h-16 rounded-2xl" />
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-y-auto bg-[#F8FAFC] p-4 text-[#111827] sm:p-6">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-7xl grid-cols-1 gap-6 xl:grid-cols-[1fr_380px]">
        <section className="flex min-h-[680px] flex-col rounded-[32px] border border-[#E2E8F0] bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <img
                src="/logo/dipera-logo-dark.png"
                alt="Dipera"
                className="h-auto w-40"
              />

              <p className="mt-5 text-sm text-[#64748B]">
                {formatFullDate(new Date())}
              </p>

              <h1 className="mt-2 text-4xl font-light tracking-[-0.04em] text-[#0F172A] sm:text-5xl">
                Willkommen im Terminal
              </h1>

              <p className="mt-3 max-w-xl text-sm leading-6 text-[#64748B]">
                {businessName
                  ? `${businessName} · Gib deine PIN ein und wähle deinen Stempelschritt.`
                  : "Gib deine PIN ein und wähle deinen Stempelschritt."}
              </p>
            </div>

            <div className="rounded-3xl border border-[#E2E8F0] bg-[#F8FAFC] px-5 py-4 text-right">
              <p className="text-sm text-[#64748B]">Aktuelle Uhrzeit</p>
              <p className="mt-1 text-3xl font-light tracking-[-0.04em] text-[#0F172A]">
                {formatClockTime(new Date(currentTime))}
              </p>
            </div>
          </div>

          <div className="mt-8 grid flex-1 grid-cols-1 gap-6 lg:grid-cols-[420px_1fr]">
            <div className="rounded-[28px] border border-[#E2E8F0] bg-[#F8FAFC] p-5">
              {locked ? (
                <div className="mb-5 rounded-2xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-center text-sm font-medium text-[#B91C1C]">
                  Terminal gesperrt. Bitte in {remainingLockSeconds} Sekunden erneut versuchen.
                </div>
              ) : (
                <div className="mb-5 text-center">
                  <p className="text-sm font-semibold text-[#0F172A]">
                    PIN eingeben
                  </p>
                  <p className="mt-1 text-xs text-[#64748B]">
                    Deine Eingabe bleibt verborgen.
                  </p>
                </div>
              )}

              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                placeholder="••••"
                value={pin}
                onChange={(event) => {
                  const onlyNumbers = event.target.value.replace(/\D/g, "");
                  setPin(onlyNumbers.slice(0, 4));
                }}
                disabled={locked || isProcessing}
                className="sr-only"
                autoFocus
              />

              <div className="mb-5 flex justify-center gap-3">
                {pinDots.map((filled, index) => (
                  <div
                    key={index}
                    className={[
                      "h-4 w-4 rounded-full border transition-all duration-200",
                      filled
                        ? "scale-110 border-[#2563EB] bg-[#2563EB]"
                        : "border-[#CBD5E1] bg-white",
                    ].join(" ")}
                  />
                ))}
              </div>

              <div className="grid grid-cols-3 gap-3">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map(
                  (digit) => (
                    <button
                      key={digit}
                      type="button"
                      onClick={() => appendDigit(digit)}
                      disabled={locked || isProcessing}
                      className="h-16 rounded-2xl border border-[#E2E8F0] bg-white text-2xl font-light text-[#0F172A] shadow-[0_8px_18px_rgba(15,23,42,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#EFF6FF] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {digit}
                    </button>
                  )
                )}

                <button
                  type="button"
                  onClick={() => setPin("")}
                  disabled={locked || isProcessing}
                  className="h-16 rounded-2xl border border-[#E2E8F0] bg-white text-sm font-medium text-[#64748B] transition hover:bg-[#F1F5F9] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Löschen
                </button>

                <button
                  type="button"
                  onClick={() => appendDigit("0")}
                  disabled={locked || isProcessing}
                  className="h-16 rounded-2xl border border-[#E2E8F0] bg-white text-2xl font-light text-[#0F172A] shadow-[0_8px_18px_rgba(15,23,42,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#EFF6FF] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  0
                </button>

                <button
                  type="button"
                  onClick={() => setPin((currentPin) => currentPin.slice(0, -1))}
                  disabled={locked || isProcessing}
                  className="h-16 rounded-2xl border border-[#E2E8F0] bg-white text-sm font-medium text-[#64748B] transition hover:bg-[#F1F5F9] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Zurück
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 content-center gap-4">
              <button
                type="button"
                onClick={handleCheckIn}
                disabled={locked || isProcessing || pin.length < 4}
                className="rounded-[26px] bg-[#2563EB] px-6 py-6 text-left text-white shadow-[0_16px_36px_rgba(37,99,235,0.22)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#1D4ED8] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <p className="text-sm text-white/75">Arbeitsbeginn</p>
                <p className="mt-1 text-2xl font-light tracking-[-0.03em]">
                  {isProcessing ? "Bitte warten..." : "Einstempeln"}
                </p>
              </button>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={handleStartBreak}
                  disabled={locked || isProcessing || pin.length < 4}
                  className="rounded-[26px] border border-[#FEF3C7] bg-[#FFFBEB] px-6 py-6 text-left text-[#92400E] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#FEF3C7] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <p className="text-sm text-[#B45309]">Pause</p>
                  <p className="mt-1 text-xl font-light tracking-[-0.03em]">
                    Pause starten
                  </p>
                </button>

                <button
                  type="button"
                  onClick={handleEndBreak}
                  disabled={locked || isProcessing || pin.length < 4}
                  className="rounded-[26px] border border-[#DBEAFE] bg-[#EFF6FF] px-6 py-6 text-left text-[#2563EB] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#DBEAFE] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <p className="text-sm text-[#2563EB]">Weiterarbeit</p>
                  <p className="mt-1 text-xl font-light tracking-[-0.03em]">
                    Pause beenden
                  </p>
                </button>
              </div>

              <button
                type="button"
                onClick={handleCheckOut}
                disabled={locked || isProcessing || pin.length < 4}
                className="rounded-[26px] border border-[#FECACA] bg-[#FEF2F2] px-6 py-6 text-left text-[#B91C1C] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#FEE2E2] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <p className="text-sm text-[#EF4444]">Arbeitsende</p>
                <p className="mt-1 text-2xl font-light tracking-[-0.03em]">
                  Ausstempeln
                </p>
              </button>

              {pin.length < 4 && !locked && (
                <p className="text-center text-sm text-[#64748B]">
                  Gib deine PIN ein, um die Stempelfunktionen zu aktivieren.
                </p>
              )}
            </div>
          </div>
        </section>

        <aside className="hidden min-h-[680px] flex-col rounded-[32px] border border-[#E2E8F0] bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] xl:flex">
          <div>
            <p className="text-sm text-[#64748B]">Live-Status</p>
            <h2 className="mt-2 text-3xl font-light tracking-[-0.04em] text-[#0F172A]">
              Aktueller Betrieb
            </h2>
          </div>

          <div className="mt-8 rounded-3xl border border-[#E2E8F0] bg-[#F8FAFC] p-5 transition hover:border-[#CBD5E1]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#64748B]">Aktiv arbeitend</p>
                <p className="mt-1 text-4xl font-light text-[#0F172A]">
                  {activeEmployees.length}
                </p>
              </div>

              <Badge variant="success" dot>
                Aktiv
              </Badge>
            </div>

            {activeEmployees.length > 0 ? (
              <div className="mt-5 flex max-h-48 flex-col gap-2 overflow-y-auto">
                {activeEmployees.map((employee) => (
                  <div
                    key={employee.id}
                    className="rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm font-medium text-[#0F172A]"
                  >
                    {employee.name}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-5 text-sm text-[#64748B]">
                Aktuell arbeitet niemand.
              </p>
            )}
          </div>

          <div className="mt-5 rounded-3xl border border-[#E2E8F0] bg-[#F8FAFC] p-5 transition hover:border-[#CBD5E1]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#64748B]">In Pause</p>
                <p className="mt-1 text-4xl font-light text-[#0F172A]">
                  {employeesOnBreak.length}
                </p>
              </div>

              <Badge variant="warning" dot>
                Pause
              </Badge>
            </div>

            {employeesOnBreak.length > 0 ? (
              <div className="mt-5 flex max-h-48 flex-col gap-2 overflow-y-auto">
                {employeesOnBreak.map((employee) => (
                  <div
                    key={employee.id}
                    className="rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm font-medium text-[#0F172A]"
                  >
                    {employee.name}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-5 text-sm text-[#64748B]">
                Aktuell ist niemand in Pause.
              </p>
            )}
          </div>

          <Button
            type="button"
            variant="secondary"
            onClick={() => setShowAdminPopup(true)}
            className="mt-auto"
          >
            Zum Adminbereich
          </Button>
        </aside>
      </div>

      <button
        type="button"
        onClick={() => setShowAdminPopup(true)}
        className="fixed bottom-4 right-4 rounded-2xl border border-[#E2E8F0] bg-white px-5 py-3 text-sm font-medium text-[#0F172A] shadow-[0_10px_24px_rgba(15,23,42,0.08)] transition hover:bg-[#F8FAFC] xl:hidden"
      >
        Zum Adminbereich
      </button>

      {showAdminPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111827]/35 p-6 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[28px] border border-[#E2E8F0] bg-white p-6 text-center shadow-[0_24px_70px_rgba(15,23,42,0.18)]">
            <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#2563EB]">
              →
            </div>

            <h2 className="text-2xl font-light tracking-[-0.03em] text-[#0F172A]">
              Admin-PIN eingeben
            </h2>

            <Input
              type="password"
              value={adminPin}
              onChange={(event) => setAdminPin(event.target.value)}
              placeholder="Admin-PIN"
              className="mt-6 text-center"
            />

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowAdminPopup(false)}
                fullWidth
              >
                Abbrechen
              </Button>

              <Button
                type="button"
                variant="primary"
                onClick={handleReturnToAdmin}
                fullWidth
              >
                Weiter
              </Button>
            </div>
          </div>
        </div>
      )}

      {showPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111827]/35 p-6 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[28px] border border-[#E2E8F0] bg-white p-6 text-center shadow-[0_24px_70px_rgba(15,23,42,0.18)]">
            <div
              className={`mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl text-2xl font-light ${popupStyles.iconClass}`}
            >
              {popupStyles.icon}
            </div>

            <p className="text-xl font-light leading-8 tracking-[-0.02em] text-[#0F172A]">
              {popupMessage}
            </p>

            <div className="mt-8 flex justify-center">
              <button
                type="button"
                onClick={() => setShowPopup(false)}
                className={`h-11 rounded-xl px-8 text-sm font-medium transition ${popupStyles.buttonClass}`}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
