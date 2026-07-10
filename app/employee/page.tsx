"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Clock,
  FileText,
  Palmtree,
  Timer,
  Target,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { BUSINESS_TIME_ZONE } from "@/lib/config/businessTime";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import CardBody from "@/components/ui/CardBody";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import Section from "@/components/ui/Section";
import StatCard from "@/components/ui/StatCard";
import PageSkeleton from "@/components/skeletons/PageSkeleton";
import { useToast } from "@/components/ui/ToastProvider";

type Employee = {
  id: string;
  name: string;
  role: string;
  account_status: string;
  vacation_days_per_year: number | null;
  work_days_per_week: number | null;
};

type Business = {
  id: string;
  name: string;
};

type Shift = {
  id: string;
  employee_id: string;
  employee_name: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  work_type_name?: string | null;
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

type EmployeeTargetHour = {
  employee_id: string;
  weekly_hours: number;
  monthly_hours: number;
};

function toBerlinDate(date: Date) {
  return new Date(
    date.toLocaleString("en-US", {
      timeZone: BUSINESS_TIME_ZONE,
    })
  );
}

function getLocalDateString(date = new Date()) {
  const localDate = toBerlinDate(date);
  const year = localDate.getFullYear();
  const month = String(localDate.getMonth() + 1).padStart(2, "0");
  const day = String(localDate.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
}

function formatTime(timeString?: string | null) {
  if (!timeString) return "—";
  return timeString.slice(0, 5);
}

function formatDateTime(dateString: string) {
  return new Date(dateString).toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatAbsenceType(type: string) {
  if (type === "vacation") return "Urlaub";
  if (type === "sick") return "Krankheit";
  return type;
}

function formatStatus(status: string) {
  if (status === "pending") return "Offen";
  if (status === "approved") return "Genehmigt";
  if (status === "rejected") return "Abgelehnt";
  return status;
}

function formatMinutes(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${hours}:${String(minutes).padStart(2, "0")} Std.`;
}

function calculateWorkedMinutes(entries: TimeEntry[]) {
  const sortedEntries = [...entries].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  let totalMinutes = 0;
  let workStart: Date | null = null;
  let pauseStart: Date | null = null;

  sortedEntries.forEach((entry) => {
    const entryDate = toBerlinDate(new Date(entry.created_at));

    if (entry.action === "check_in") {
      workStart = entryDate;
      pauseStart = null;
    }

    if (entry.action === "break_start" && workStart) {
      totalMinutes += (entryDate.getTime() - workStart.getTime()) / 60000;
      workStart = null;
      pauseStart = entryDate;
    }

    if (entry.action === "break_end" && pauseStart) {
      workStart = entryDate;
      pauseStart = null;
    }

    if (entry.action === "check_out" && workStart) {
      totalMinutes += (entryDate.getTime() - workStart.getTime()) / 60000;
      workStart = null;
      pauseStart = null;
    }
  });

  return Math.max(0, Math.round(totalMinutes));
}

function getCurrentClockStatus(entries: TimeEntry[]) {
  const lastEntry = [...entries].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )[0];

  if (!lastEntry) {
    return {
      label: "Nicht eingestempelt",
      variant: "muted" as const,
      description: "Heute wurde noch keine Arbeitszeit erfasst.",
    };
  }

  if (lastEntry.action === "check_in" || lastEntry.action === "break_end") {
    return {
      label: "Eingestempelt",
      variant: "success" as const,
      description: `Letzte Buchung: ${formatDateTime(lastEntry.created_at)}`,
    };
  }

  if (lastEntry.action === "break_start") {
    return {
      label: "In Pause",
      variant: "warning" as const,
      description: `Pause gestartet: ${formatDateTime(lastEntry.created_at)}`,
    };
  }

  return {
    label: "Ausgestempelt",
    variant: "muted" as const,
    description: `Letzte Buchung: ${formatDateTime(lastEntry.created_at)}`,
  };
}

export default function EmployeeOverviewPage() {
  const { showToast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [targetHours, setTargetHours] = useState<EmployeeTargetHour | null>(null);
  const [todayEntries, setTodayEntries] = useState<TimeEntry[]>([]);
  const [upcomingShifts, setUpcomingShifts] = useState<Shift[]>([]);
  const [absences, setAbsences] = useState<Absence[]>([]);

  async function loadOverview() {
    setIsLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("business_id, employee_id")
        .eq("id", user.id)
        .single();

      if (profileError || !profile?.business_id || !profile?.employee_id) {
        console.error(profileError);
        showToast({
          type: "error",
          title: "Profil konnte nicht geladen werden",
          description: "Bitte melde dich erneut an.",
        });
        return;
      }

      const today = getLocalDateString();
      const monthStart = `${today.slice(0, 8)}01`;

      const nextMonth = new Date(`${monthStart}T00:00:00`);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      const monthEnd = getLocalDateString(nextMonth);

      const [employeeResult, businessResult, targetResult, entriesResult, shiftsResult, absencesResult] =
        await Promise.all([
          supabase
            .from("employees")
            .select("id, name, role, account_status, vacation_days_per_year, work_days_per_week")
            .eq("id", profile.employee_id)
            .eq("business_id", profile.business_id)
            .single(),
          supabase
            .from("businesses")
            .select("id, name")
            .eq("id", profile.business_id)
            .single(),
          supabase
            .from("employee_target_hours")
            .select("employee_id, weekly_hours, monthly_hours")
            .eq("employee_id", profile.employee_id)
            .maybeSingle(),
          supabase
            .from("time_entries")
            .select("id, employee_id, employee_name, action, created_at")
            .eq("business_id", profile.business_id)
            .eq("employee_id", profile.employee_id)
            .gte("created_at", `${today}T00:00:00`)
            .lt("created_at", `${today}T23:59:59`)
            .order("created_at", { ascending: true }),
          supabase
            .from("shifts")
            .select("id, employee_id, employee_name, shift_date, start_time, end_time, work_type_name")
            .eq("business_id", profile.business_id)
            .eq("employee_id", profile.employee_id)
            .gte("shift_date", today)
            .order("shift_date", { ascending: true })
            .order("start_time", { ascending: true })
            .limit(5),
          supabase
            .from("absences")
            .select("id, employee_id, employee_name, type, start_date, end_date, request_status")
            .eq("business_id", profile.business_id)
            .eq("employee_id", profile.employee_id)
            .gte("end_date", monthStart)
            .lt("start_date", monthEnd)
            .order("start_date", { ascending: true }),
        ]);

      if (employeeResult.error) throw employeeResult.error;
      if (businessResult.error) throw businessResult.error;
      if (targetResult.error) console.error(targetResult.error);
      if (entriesResult.error) throw entriesResult.error;
      if (shiftsResult.error) throw shiftsResult.error;
      if (absencesResult.error) throw absencesResult.error;

      setEmployee(employeeResult.data as Employee);
      setBusiness(businessResult.data as Business);
      setTargetHours((targetResult.data as EmployeeTargetHour | null) || null);
      setTodayEntries((entriesResult.data || []) as TimeEntry[]);
      setUpcomingShifts((shiftsResult.data || []) as Shift[]);
      setAbsences((absencesResult.data || []) as Absence[]);
    } catch (error) {
      console.error(error);
      showToast({
        type: "error",
        title: "Übersicht konnte nicht geladen werden",
        description: "Bitte lade die Seite neu und versuche es erneut.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadOverview();
  }, []);

  const clockStatus = useMemo(
    () => getCurrentClockStatus(todayEntries),
    [todayEntries]
  );

  const workedToday = useMemo(
    () => calculateWorkedMinutes(todayEntries),
    [todayEntries]
  );

  const nextShift = upcomingShifts[0] || null;
  const pendingAbsences = absences.filter(
    (absence) => absence.request_status === "pending"
  ).length;

  const mobileStatusStyle =
  clockStatus.variant === "success"
    ? {
        card: "border-[#BBF7D0] bg-gradient-to-br from-[#F0FDF4] to-white",
        icon: "bg-[#DCFCE7] text-[#16A34A]",
        text: "text-[#15803D]",
      }
    : clockStatus.variant === "warning"
    ? {
        card: "border-[#FDE68A] bg-gradient-to-br from-[#FFFBEB] to-white",
        icon: "bg-[#FEF3C7] text-[#D97706]",
        text: "text-[#B45309]",
      }
    : {
        card: "border-[#BFDBFE] bg-gradient-to-br from-[#EFF6FF] to-white",
        icon: "bg-[#DBEAFE] text-[#2563EB]",
        text: "text-[#0F172A]",
      };

  if (isLoading) {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-8">
      {/* Mobile Begrüßung */}
<div className="md:hidden">

  <div className="mt-2 flex items-center gap-2">
    <h1 className="text-[2rem] font-light leading-tight tracking-[-0.04em] text-[#0F172A]">
      Hallo {employee?.name || ""}
    </h1>

    <span
      aria-hidden="true"
      className="origin-bottom-right animate-[wave_1.8s_ease-in-out_1]"
    >
      👋
    </span>
  </div>

  <p className="mt-2 text-sm leading-6 text-[#64748B]">
    {business
      ? `${business.name} · Dein Überblick für heute.`
      : "Dein Überblick für heute."}
  </p>
</div>

{/* Desktop Begrüßung */}
<div className="hidden md:block">
  <PageHeader
    eyebrow="Mitarbeiterbereich" 
    title={employee ? `Hallo ${employee.name}` : "Übersicht"}
    description={
      business
        ? `${business.name} · Dein persönlicher Überblick für heute.`
        : "Dein persönlicher Überblick für heute."
    }
  />
</div>

      {/* Mobile Statuskarten */}
<div className="space-y-3 md:hidden">
  <div
    className={[
      "rounded-3xl border p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)]",
      mobileStatusStyle.card,
    ].join(" ")}
  >
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-[#64748B]">Status heute</p>

        <p
          className={[
            "mt-2 text-2xl font-semibold leading-tight tracking-[-0.03em]",
            mobileStatusStyle.text,
          ].join(" ")}
        >
          {clockStatus.label}
        </p>

        <p className="mt-2 text-xs leading-5 text-[#64748B]">
          {clockStatus.description}
        </p>
      </div>

      <div
        className={[
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
          mobileStatusStyle.icon,
        ].join(" ")}
      >
        <Clock className="h-5 w-5" />
      </div>
    </div>
  </div>

  <div className="grid grid-cols-2 gap-3">
    <div className="rounded-3xl border border-[#BFDBFE] bg-gradient-to-br from-[#EFF6FF] to-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#DBEAFE] text-[#2563EB]">
        <Timer className="h-4 w-4" />
      </div>

      <p className="mt-4 text-xs font-medium text-[#64748B]">
        Gearbeitet heute
      </p>

      <p className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-[#0F172A]">
        {formatMinutes(workedToday)}
      </p>
    </div>

    <div className="rounded-3xl border border-[#DDD6FE] bg-gradient-to-br from-[#F5F3FF] to-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EDE9FE] text-[#7C3AED]">
        <CalendarDays className="h-4 w-4" />
      </div>

      <p className="mt-4 text-xs font-medium text-[#64748B]">
        Nächste Schicht
      </p>

      <p className="mt-1 text-xl font-semibold leading-tight tracking-[-0.03em] text-[#0F172A]">
        {nextShift ? formatDate(nextShift.shift_date) : "Keine"}
      </p>

      {nextShift && (
        <p className="mt-1 text-xs text-[#7C3AED]">
          {formatTime(nextShift.start_time)} Uhr
        </p>
      )}
    </div>

    <div className="col-span-2 rounded-3xl border border-[#FDE68A] bg-gradient-to-br from-[#FFFBEB] to-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-[#64748B]">
            Sollstunden im Monat
          </p>

          <p className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-[#0F172A]">
            {targetHours ? `${targetHours.monthly_hours} Std.` : "—"}
          </p>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FEF3C7] text-[#D97706]">
          <Target className="h-5 w-5" />
        </div>
      </div>
    </div>
  </div>
</div>

{/* Desktop Statuskarten */}
<div className="hidden grid-cols-1 gap-6 md:grid md:grid-cols-2 xl:grid-cols-4">
  <StatCard
    title="Status heute"
    value={clockStatus.label}
    badge="Live"
    badgeVariant={clockStatus.variant}
  />

  <StatCard
    title="Gearbeitet heute"
    value={formatMinutes(workedToday)}
    badge="Heute"
    badgeVariant="primary"
  />

  <StatCard
    title="Nächste Schicht"
    value={nextShift ? formatDate(nextShift.shift_date) : "Keine"}
    badge={nextShift ? `${formatTime(nextShift.start_time)} Uhr` : "Frei"}
    badgeVariant={nextShift ? "success" : "muted"}
  />

  <StatCard
    title="Sollstunden"
    value={targetHours ? `${targetHours.monthly_hours} Std.` : "—"}
    badge="Monat"
    badgeVariant="muted"
  />
</div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card hover className="order-2 xl:order-1">
          <CardBody>
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#2563EB]">
                  <Clock className="h-6 w-6" />
                </div>

                <h2 className="text-2xl font-semibold tracking-[-0.02em] text-[#0F172A]">
                  Arbeitszeit erfassen
                </h2>

                <p className="mt-2 max-w-xl text-sm leading-6 text-[#64748B]">
                  {clockStatus.description} Die mobile Stempelung wird später mit
                  einer Standortprüfung abgesichert.
                </p>
              </div>

              <Link href="/employee/clock">
                <Button variant="primary">Zum Stempeln</Button>
              </Link>
            </div>
          </CardBody>
        </Card>

        <Card hover className="order-1 xl:order-2">
          <CardBody>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#2563EB]">
                  <CalendarDays className="h-6 w-6" />
                </div>

                <h2 className="text-2xl font-semibold tracking-[-0.02em] text-[#0F172A]">
                  Meine Schichten
                </h2>

                <p className="mt-2 text-sm leading-6 text-[#64748B]">
                  Sieh dir deinen Wochenplan und kommende Einsätze an.
                </p>
              </div>
            </div>

            <div className="mt-6">
              <Link href="/employee/shifts">
                <Button variant="secondary" fullWidth>
                  Schichtplan öffnen
                </Button>
              </Link>
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Section
          title="Kommende Schichten"
          description="Deine nächsten geplanten Einsätze."
          action={
            <Link href="/employee/shifts">
              <Button variant="ghost" size="sm">
                Alle anzeigen
              </Button>
            </Link>
          }
        >
          {upcomingShifts.length > 0 ? (
            <div className="flex flex-col gap-3">
              {upcomingShifts.slice(0, 3).map((shift) => (
                <div
                  key={shift.id}
                  className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 transition hover:border-[#CBD5E1]"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold text-[#0F172A]">
                        {formatDate(shift.shift_date)}
                      </p>
                      <p className="mt-1 text-sm text-[#64748B]">
                        {formatTime(shift.start_time)}–{formatTime(shift.end_time)} Uhr
                      </p>
                    </div>

                    <Badge variant="primary" dot>
                      {shift.work_type_name || "Schicht"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              compact
              title="Keine kommenden Schichten"
              description="Aktuell sind keine weiteren Schichten für dich geplant."
            />
          )}
        </Section>

        <Section
          title="Abwesenheiten"
          description="Offene und aktuelle Abwesenheiten im Überblick."
          action={
            <Link href="/employee/absences">
              <Button variant="ghost" size="sm">
                Öffnen
              </Button>
            </Link>
          }
        >
          {absences.length > 0 ? (
            <div className="flex flex-col gap-3">
              {absences.slice(0, 3).map((absence) => (
                <div
                  key={absence.id}
                  className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 transition hover:border-[#CBD5E1]"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold text-[#0F172A]">
                        {formatAbsenceType(absence.type)}
                      </p>
                      <p className="mt-1 text-sm text-[#64748B]">
                        {formatDate(absence.start_date)} bis {formatDate(absence.end_date)}
                      </p>
                    </div>

                    <Badge
                      variant={
                        absence.request_status === "approved"
                          ? "success"
                          : absence.request_status === "rejected"
                          ? "danger"
                          : "warning"
                      }
                      dot
                    >
                      {formatStatus(absence.request_status)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              compact
              title="Keine Abwesenheiten"
              description="Du hast aktuell keine Abwesenheiten für diesen Monat."
            />
          )}
        </Section>
      </div>

      <div className="hidden gap-6 xl:grid xl:grid-cols-3">
        <Card hover>
          <CardBody>
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#2563EB]">
              <Clock className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-semibold text-[#0F172A]">Arbeitszeiten</h3>
            <p className="mt-2 text-sm leading-6 text-[#64748B]">
              Kontrolliere deine Arbeitstage und Monatszeiten.
            </p>
            <div className="mt-5">
              <Link href="/employee/times">
                <Button variant="secondary" fullWidth>
                  Zeiten ansehen
                </Button>
              </Link>
            </div>
          </CardBody>
        </Card>

        <Card hover>
          <CardBody>
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#2563EB]">
              <Palmtree className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-semibold text-[#0F172A]">Abwesenheit</h3>
            <p className="mt-2 text-sm leading-6 text-[#64748B]">
              Beantrage Urlaub oder Krankheit direkt im Mitarbeiterbereich.
            </p>
            <div className="mt-5">
              <Link href="/employee/absences">
                <Button variant="secondary" fullWidth>
                  Antrag erstellen
                </Button>
              </Link>
            </div>
          </CardBody>
        </Card>

        <Card hover>
          <CardBody>
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#2563EB]">
              <FileText className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-semibold text-[#0F172A]">Lohndokumente</h3>
            <p className="mt-2 text-sm leading-6 text-[#64748B]">
              Hier findest du später deine Lohnabrechnungen und Dokumente.
            </p>
            <div className="mt-5">
              <Link href="/employee/documents">
                <Button variant="secondary" fullWidth>
                  Dokumente öffnen
                </Button>
              </Link>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
