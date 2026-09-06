"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  CirclePause,
  Clock3,
  Euro,
  Headphones,
  Mail,
  MessageSquare,
  PlayCircle,
  Users,
} from "lucide-react";

import { supabase } from "@/lib/supabaseClient";
import { getBusinessId } from "@/lib/getBusinessId";

import Card from "@/components/ui/Card";
import CardHeader from "@/components/ui/CardHeader";
import CardBody from "@/components/ui/CardBody";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/ToastProvider";

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
  planned_break_minutes?: number | null;
  is_published?: boolean;
};

type PayrollOverviewRow = {
  employee_id: string;
  employee_name: string;
  period_status: string;
  worked_minutes: number;
  total_surcharge_gross: number;
  overtime_gross: number;
  base_gross: number;
  estimated_gross: number;
};

type PendingAbsence = {
  id: string;
};

type OpenConflict = {
  conflict_id: string;
};

type OpenComplianceWarning = {
  id: string;
};

function getMonthRange() {
  const now = new Date();

  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const start = `${year}-${String(month).padStart(2, "0")}-01`;

  const nextMonthDate = new Date(year, month, 1);
  const nextYear = nextMonthDate.getFullYear();
  const nextMonth = nextMonthDate.getMonth() + 1;

  const endExclusive = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;

  return {
    year,
    month,
    start,
    endExclusive,
  };
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatHoursFromMinutes(minutes: number) {
  const hours = minutes / 60;

  return new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(hours);
}

function timeToMinutes(time: string) {
  const [hours, minutes] = time.slice(0, 5).split(":").map(Number);
  return hours * 60 + minutes;
}

function getPlannedNetMinutes(shift: Shift) {
  let start = timeToMinutes(shift.start_time);
  let end = timeToMinutes(shift.end_time);

  if (end <= start) {
    end += 24 * 60;
  }

  return Math.max(
    0,
    end - start - Math.max(0, Number(shift.planned_break_minutes ?? 0)),
  );
}

export default function AdminPage() {
  const { showToast } = useToast();

  const [isLoading, setIsLoading] = useState(true);

  const [businessName, setBusinessName] = useState("");
  const [adminName, setAdminName] = useState("");

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [todayShifts, setTodayShifts] = useState<Shift[]>([]);
  const [monthShifts, setMonthShifts] = useState<Shift[]>([]);
  const [payrollRows, setPayrollRows] = useState<PayrollOverviewRow[]>([]);

  const [pendingAbsenceCount, setPendingAbsenceCount] = useState(0);
  const [openConflictCount, setOpenConflictCount] = useState(0);
  const [openComplianceCount, setOpenComplianceCount] = useState(0);

  const [workTypesCount, setWorkTypesCount] = useState(0);
  const [shiftTemplatesCount, setShiftTemplatesCount] = useState(0);
  const [payRulesCount, setPayRulesCount] = useState(0);
  const [timeEntriesCount, setTimeEntriesCount] = useState(0);

  async function loadDashboard() {
    setIsLoading(true);

    try {
      const businessId = await getBusinessId();

      if (!businessId) {
        throw new Error("Kein Betrieb gefunden.");
      }

      const today = new Date().toLocaleDateString("en-CA");
      const monthRange = getMonthRange();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const [
        businessResult,
        employeeResult,
        todayShiftResult,
        monthShiftResult,
        payrollResult,
        pendingAbsenceResult,
        conflictResult,
        complianceResult,
        workTypesResult,
        shiftTemplatesResult,
        payRulesResult,
        timeEntriesResult,
        profileResult,
      ] = await Promise.all([
        supabase
          .from("businesses")
          .select("name")
          .eq("id", businessId)
          .single(),

        supabase
          .from("employees")
          .select("id, name, status, account_status")
          .eq("business_id", businessId)
          .eq("account_status", "active")
          .order("name", { ascending: true }),

        supabase
          .from("shifts")
          .select(
            "id, employee_id, employee_name, shift_date, start_time, end_time, planned_break_minutes, is_published",
          )
          .eq("business_id", businessId)
          .eq("shift_date", today)
          .order("start_time", { ascending: true }),

        supabase
          .from("shifts")
          .select(
            "id, employee_id, employee_name, shift_date, start_time, end_time, planned_break_minutes, is_published",
          )
          .eq("business_id", businessId)
          .gte("shift_date", monthRange.start)
          .lt("shift_date", monthRange.endExclusive),

        supabase.rpc("get_business_month_work_pay_overview", {
          p_year: monthRange.year,
          p_month: monthRange.month,
        }),

        supabase
          .from("absences")
          .select("id", { count: "exact", head: true })
          .eq("business_id", businessId)
          .eq("request_status", "pending"),

        supabase
          .from("admin_time_conflicts")
          .select("conflict_id", { count: "exact", head: true })
          .eq("business_id", businessId)
          .eq("status", "open"),

        supabase
          .from("time_compliance_warnings")
          .select("id", { count: "exact", head: true })
          .eq("business_id", businessId)
          .eq("status", "open"),

        supabase
          .from("work_types")
          .select("id", { count: "exact", head: true })
          .eq("business_id", businessId),

        supabase
          .from("shift_templates")
          .select("id", { count: "exact", head: true })
          .eq("business_id", businessId),

        supabase
          .from("pay_rules")
          .select("id", { count: "exact", head: true })
          .eq("business_id", businessId),

        supabase
          .from("time_entries")
          .select("id", { count: "exact", head: true })
          .eq("business_id", businessId),

        user
          ? supabase
              .from("profiles")
              .select("employee_id")
              .eq("id", user.id)
              .single()
          : Promise.resolve({ data: null, error: null }),
      ]);

      if (businessResult.error) {
        console.error("DASHBOARD BUSINESS ERROR:", businessResult.error);
      } else {
        setBusinessName(businessResult.data?.name || "");
      }

      if (employeeResult.error) {
        console.error("DASHBOARD EMPLOYEES ERROR:", employeeResult.error);
      } else {
        setEmployees((employeeResult.data || []) as Employee[]);
      }

      if (todayShiftResult.error) {
        console.error("DASHBOARD TODAY SHIFTS ERROR:", todayShiftResult.error);
      } else {
        setTodayShifts((todayShiftResult.data || []) as Shift[]);
      }

      if (monthShiftResult.error) {
        console.error("DASHBOARD MONTH SHIFTS ERROR:", monthShiftResult.error);
      } else {
        setMonthShifts((monthShiftResult.data || []) as Shift[]);
      }

      if (payrollResult.error) {
        console.error("DASHBOARD PAYROLL ERROR:", payrollResult.error);
        setPayrollRows([]);
      } else {
        setPayrollRows((payrollResult.data || []) as PayrollOverviewRow[]);
      }

      setPendingAbsenceCount(pendingAbsenceResult.count ?? 0);
      setOpenConflictCount(conflictResult.count ?? 0);
      setOpenComplianceCount(complianceResult.count ?? 0);

      setWorkTypesCount(workTypesResult.count ?? 0);
      setShiftTemplatesCount(shiftTemplatesResult.count ?? 0);
      setPayRulesCount(payRulesResult.count ?? 0);
      setTimeEntriesCount(timeEntriesResult.count ?? 0);

      if (profileResult.data?.employee_id) {
        const { data: adminEmployee, error: adminEmployeeError } =
          await supabase
            .from("employees")
            .select("name")
            .eq("id", profileResult.data.employee_id)
            .maybeSingle();

        if (adminEmployeeError) {
          console.error("DASHBOARD ADMIN NAME ERROR:", adminEmployeeError);
        } else {
          setAdminName(adminEmployee?.name || "");
        }
      }
    } catch (error) {
      console.error("DASHBOARD LOAD ERROR:", error);

      showToast({
        type: "error",
        title: "Dashboard konnte nicht geladen werden",
        description: "Bitte lade die Seite neu oder versuche es später erneut.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  function getGreeting() {
    const hour = new Date().getHours();

    if (hour < 11) return "Guten Morgen";
    if (hour < 18) return "Guten Tag";

    return "Guten Abend";
  }

  function getTodayLabel() {
    return new Date().toLocaleDateString("de-DE", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  }

  function showPlaceholderToast(title: string) {
    showToast({
      type: "info",
      title,
      description: "Diese Verknüpfung wird später mit dem Hilfecenter verbunden.",
    });
  }

  const checkedInEmployees = useMemo(
    () => employees.filter((employee) => employee.status === "checked_in"),
    [employees],
  );

  const employeesOnBreak = useMemo(
    () => employees.filter((employee) => employee.status === "on_break"),
    [employees],
  );

  const payrollTotals = useMemo(() => {
    return payrollRows.reduce(
      (totals, row) => {
        totals.gross += Number(row.estimated_gross ?? 0);
        totals.workedMinutes += Number(row.worked_minutes ?? 0);
        totals.surcharges +=
          Number(row.total_surcharge_gross ?? 0) +
          Number(row.overtime_gross ?? 0);

        return totals;
      },
      {
        gross: 0,
        workedMinutes: 0,
        surcharges: 0,
      },
    );
  }, [payrollRows]);

  const plannedMonthMinutes = useMemo(
    () =>
      monthShifts.reduce(
        (total, shift) => total + getPlannedNetMinutes(shift),
        0,
      ),
    [monthShifts],
  );

  const unpublishedMonthShifts = useMemo(
    () => monthShifts.filter((shift) => !shift.is_published).length,
    [monthShifts],
  );

  const openTasks =
    pendingAbsenceCount +
    openConflictCount +
    openComplianceCount;

  const checklistItems = [
    {
      title: "Mitarbeiter anlegen",
      description: "Lege dein Team und die wichtigsten Stammdaten an.",
      done: employees.length > 0,
      href: "/admin/employees",
    },
    {
      title: "Arbeitstypen & Zuschläge einrichten",
      description: "Definiere Arbeitsbereiche, Vorlagen und Zuschläge.",
      done: workTypesCount > 0 || shiftTemplatesCount > 0 || payRulesCount > 0,
      href: "/admin/settings",
    },
    {
      title: "Schichtplanung erstellen",
      description: "Plane die ersten Schichten und veröffentliche sie.",
      done: monthShifts.length > 0,
      href: "/admin/schedule",
    },
    {
      title: "Terminal einrichten & testen",
      description: "Öffne den Kiosk und teste eine Stempelung.",
      done: timeEntriesCount > 0,
      href: "/kiosk",
    },
    {
      title: "Abrechnung prüfen",
      description: "Prüfe Arbeitszeiten und Monatsabrechnung.",
      done: payrollRows.length > 0,
      href: "/admin/payroll",
    },
  ];

  const completedChecklistItems = checklistItems.filter((item) => item.done).length;

  const onboardingProgress = Math.round(
    (completedChecklistItems / checklistItems.length) * 100,
  );

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.08em] text-[#2563EB]">
            Dashboard
          </p>

          <h1 className="text-[2.4rem] font-light leading-tight tracking-[-0.04em] text-[#0F172A]">
            {getGreeting()}
            {adminName ? `, ${adminName.split(" ")[0]}` : ""}! 👋
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-[#64748B]">
            {businessName
              ? `Hier ist der aktuelle Überblick für ${businessName}.`
              : "Hier siehst du die wichtigsten Betriebsdaten auf einen Blick."}
          </p>
        </div>

        <div className="inline-flex w-fit items-center gap-2 rounded-2xl border border-[#CBD5E1] bg-[#EEF2F6] px-4 py-3 text-sm text-[#64748B] shadow-[0_4px_12px_rgba(15,23,42,0.07)]">
          <CalendarDays className="h-4 w-4 text-[#2563EB]" />
          {getTodayLabel()}
        </div>
      </div>

      <div className="rounded-3xl border border-[#D7DEE8] bg-[#EEF2F6] p-4 shadow-[0_6px_18px_rgba(15,23,42,0.08)] md:p-5">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-[1fr_1fr_1fr_1.35fr_1fr_1fr]">
          <KpiCard
            icon={<Users className="h-5 w-5" />}
            title="Aktive Mitarbeiter"
            value={employees.length}
            subtitle="Aktive Konten"
            iconClassName="bg-[#E8F2FB] text-[#2563EB]"
          />

          <KpiCard
            icon={<Clock3 className="h-5 w-5" />}
            title="Eingestempelt"
            value={checkedInEmployees.length}
            subtitle="Aktuell im Dienst"
            iconClassName="bg-[#ECFDF5] text-[#047857]"
          />

          <KpiCard
            icon={<CirclePause className="h-5 w-5" />}
            title="In Pause"
            value={employeesOnBreak.length}
            subtitle="Aktuell pausierend"
            iconClassName="bg-[#FFF8E8] text-[#B45309]"
          />

          <KpiCard
            icon={<Euro className="h-5 w-5" />}
            title="Bruttolohn bisher"
            value={formatCurrency(payrollTotals.gross)}
            subtitle="Aktueller Monat"
            iconClassName="bg-[#F5F3FF] text-[#7C3AED]"
            compact
          />

          <KpiCard
            icon={<CalendarDays className="h-5 w-5" />}
            title="Schichten im Monat"
            value={monthShifts.length}
            subtitle={`${formatHoursFromMinutes(plannedMonthMinutes)} Std. geplant`}
            iconClassName="bg-[#EFF6FF] text-[#2563EB]"
          />

          <KpiCard
            icon={<AlertTriangle className="h-5 w-5" />}
            title="Offene Aufgaben"
            value={openTasks}
            subtitle="Anträge & Prüfungen"
            iconClassName="bg-[#FEF2F2] text-[#B91C1C]"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader
            title="Aktueller Personalstatus"
            description="Wer arbeitet gerade und wer befindet sich in Pause?"
          />

          <CardBody>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <DashboardStatusPanel
                title="Eingestempelt"
                count={checkedInEmployees.length}
                badgeVariant="success"
                items={checkedInEmployees.map((employee) => employee.name)}
                emptyText="Aktuell ist niemand eingestempelt."
              />

              <DashboardStatusPanel
                title="In Pause"
                count={employeesOnBreak.length}
                badgeVariant="warning"
                items={employeesOnBreak.map((employee) => employee.name)}
                emptyText="Aktuell befindet sich niemand in Pause."
              />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Offene Vorgänge"
            description="Dinge, die deine Aufmerksamkeit benötigen."
          />

          <CardBody>
            <div className="space-y-3">
              <QuickTaskRow
                label="Abwesenheitsanträge"
                value={pendingAbsenceCount}
                href="/admin/absences"
              />

              <QuickTaskRow
                label="Zeitkonflikte"
                value={openConflictCount}
                href="/admin/corrections"
              />

              <QuickTaskRow
                label="Arbeitszeit-Warnungen"
                value={openComplianceCount}
                href="/admin/corrections"
              />

              <QuickTaskRow
                label="Unveröffentlichte Monatsschichten"
                value={unpublishedMonthShifts}
                href="/admin/schedule"
              />
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader
            title="Monat auf einen Blick"
            description="Aktueller Planungs- und Kostenstand."
          />

          <CardBody>
            <div className="grid grid-cols-2 gap-4">
              <MiniMetric
                label="Bruttolohn bisher"
                value={formatCurrency(payrollTotals.gross)}
              />

              <MiniMetric
                label="Zuschläge & Überstunden"
                value={formatCurrency(payrollTotals.surcharges)}
              />

              <MiniMetric
                label="Arbeitszeit bisher"
                value={`${formatHoursFromMinutes(payrollTotals.workedMinutes)} Std.`}
              />

              <MiniMetric
                label="Geplante Nettozeit"
                value={`${formatHoursFromMinutes(plannedMonthMinutes)} Std.`}
              />
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  window.location.href = "/admin/time-entries";
                }}
              >
                Arbeitszeiten
              </Button>

              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  window.location.href = "/admin/payroll";
                }}
              >
                Abrechnung
              </Button>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Heute geplant"
            description="Schichten für den heutigen Tag."
          />

          <CardBody>
            {todayShifts.length > 0 ? (
              <div className="space-y-2">
                {todayShifts.slice(0, 6).map((shift) => (
                  <div
                    key={shift.id}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-[#CBD5E1] bg-[#EEF2F6] px-4 py-3 shadow-[0_3px_10px_rgba(15,23,42,0.05)]"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#0F172A]">
                        {shift.employee_name}
                      </p>
                      <p className="mt-1 text-xs text-[#64748B]">
                        {shift.is_published ? "Veröffentlicht" : "Entwurf"}
                      </p>
                    </div>

                    <p className="shrink-0 text-sm font-semibold text-[#334155]">
                      {shift.start_time.slice(0, 5)} – {shift.end_time.slice(0, 5)}
                    </p>
                  </div>
                ))}

                {todayShifts.length > 6 && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      window.location.href = "/admin/schedule";
                    }}
                  >
                    Alle {todayShifts.length} Schichten ansehen
                  </Button>
                )}
              </div>
            ) : (
              <EmptyDashboardText>
                Für heute sind keine Schichten eingetragen.
              </EmptyDashboardText>
            )}
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader
            title="Anleitungen & Video-Tutorials"
            description="Lerne Dipera Schritt für Schritt kennen."
          />

          <CardBody>
            <div className="mb-5 rounded-2xl border border-[#CBD5E1] bg-[#EEF2F6] p-4 shadow-[0_4px_12px_rgba(15,23,42,0.06)]">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-[#0F172A]">
                    Einrichtung: {completedChecklistItems} von{" "}
                    {checklistItems.length} Schritten erledigt
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[#64748B]">
                    Die Liste aktualisiert sich automatisch anhand deiner echten
                    Betriebsdaten.
                  </p>
                </div>

                <Badge
                  variant={onboardingProgress === 100 ? "success" : "primary"}
                  dot={onboardingProgress === 100}
                >
                  {onboardingProgress} %
                </Badge>
              </div>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#CBD5E1]">
                <div
                  className="h-full rounded-full bg-[#2563EB] transition-all duration-500 ease-out"
                  style={{ width: `${onboardingProgress}%` }}
                />
              </div>
            </div>

            <div className="space-y-3">
              {checklistItems.map((item, index) => (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => {
                    window.location.href = item.href;
                  }}
                  className="flex w-full items-center gap-4 rounded-2xl border border-[#CBD5E1] bg-[#F8FAFC] px-4 py-3 text-left shadow-[0_3px_10px_rgba(15,23,42,0.05)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#EEF2F6] hover:shadow-[0_6px_16px_rgba(15,23,42,0.09)]"
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold ${
                      item.done
                        ? "border-[#16A34A] bg-[#DCFCE7] text-[#16A34A]"
                        : "border-[#CBD5E1] bg-white text-[#94A3B8]"
                    }`}
                  >
                    {item.done ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      index + 1
                    )}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-[#0F172A]">
                      {item.title}
                    </span>
                    <span className="block truncate text-xs text-[#64748B]">
                      {item.description}
                    </span>
                  </span>

                  <Badge variant={item.done ? "success" : "muted"} dot={item.done}>
                    {item.done ? "Erledigt" : "Ausstehend"}
                  </Badge>

                  <ArrowRight className="h-4 w-4 text-[#94A3B8]" />
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => showPlaceholderToast("Alle Anleitungen & Videos")}
              className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-[#2563EB] transition hover:text-[#1D4ED8]"
            >
              Alle Anleitungen & Videos ansehen
              <ArrowRight className="h-4 w-4" />
            </button>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Kontakt & Support"
            description="Wir sind für dich da."
          />

          <CardBody>
            <div className="grid grid-cols-1 gap-3">
              <SupportAction
                icon={<BookOpen className="h-5 w-5" />}
                title="Dokumentation"
                description="Detaillierte Anleitungen und häufige Fragen."
                onClick={() => showPlaceholderToast("Dokumentation")}
              />

              <SupportAction
                icon={<PlayCircle className="h-5 w-5" />}
                title="Video-Tutorials"
                description="Kurze Videos zu allen wichtigen Funktionen."
                onClick={() => showPlaceholderToast("Video-Tutorials")}
              />

              <SupportAction
                icon={<Mail className="h-5 w-5" />}
                title="E-Mail Support"
                description="support@dipera.de"
                onClick={() => {
                  window.location.href = "/admin/contact";
                }}
              />

              <SupportAction
                icon={<MessageSquare className="h-5 w-5" />}
                title="Feedback senden"
                description="Deine Meinung hilft uns, Dipera zu verbessern."
                onClick={() => {
                  window.location.href = "/admin/feedback";
                }}
              />
            </div>

            <div className="mt-5 rounded-2xl border border-[#BFDBFE] bg-[#E8F2FB] px-4 py-3 text-sm leading-6 text-[#1E40AF]">
              Support-Zeiten: Mo – Fr, 09:00 – 18:00 Uhr
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

type KpiCardProps = {
  icon: ReactNode;
  title: string;
  value: ReactNode;
  subtitle: string;
  iconClassName: string;
  compact?: boolean;
};

function KpiCard({
  icon,
  title,
  value,
  subtitle,
  iconClassName,
  compact = false,
}: KpiCardProps) {
  return (
    <div className="rounded-3xl border border-[#CBD5E1] bg-white p-5 shadow-[0_6px_18px_rgba(15,23,42,0.10)]">
      <div className="flex items-start gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${iconClassName}`}
        >
          {icon}
        </div>

        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.06em] text-[#64748B]">
            {title}
          </p>

          <p
            className={[
              "mt-2 min-w-0 max-w-full whitespace-nowrap font-light leading-none tracking-[-0.035em] text-[#0F172A]",
              compact
                ? "text-[clamp(1.05rem,1.15vw,1.4rem)] tracking-[-0.045em]"
                : "text-3xl",
            ].join(" ")}
          >
            {value}
          </p>

          <p className="mt-2 text-xs text-[#64748B]">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}

function DashboardStatusPanel({
  title,
  count,
  badgeVariant,
  items,
  emptyText,
}: {
  title: string;
  count: number;
  badgeVariant: "success" | "warning";
  items: string[];
  emptyText: string;
}) {
  return (
    <div className="rounded-3xl border border-[#CBD5E1] bg-[#EEF2F6] p-4 shadow-[0_5px_14px_rgba(15,23,42,0.07)]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-[#0F172A]">{title}</p>
        <Badge variant={badgeVariant}>{count}</Badge>
      </div>

      {items.length > 0 ? (
        <div className="mt-4 space-y-2">
          {items.slice(0, 5).map((name) => (
            <div
              key={name}
              className="rounded-xl border border-[#D7DEE8] bg-white px-3 py-2 text-sm font-medium text-[#334155]"
            >
              {name}
            </div>
          ))}

          {items.length > 5 && (
            <p className="pt-1 text-xs text-[#64748B]">
              + {items.length - 5} weitere
            </p>
          )}
        </div>
      ) : (
        <p className="mt-4 text-sm leading-6 text-[#64748B]">{emptyText}</p>
      )}
    </div>
  );
}

function QuickTaskRow({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href: string;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        window.location.href = href;
      }}
      className="flex w-full items-center justify-between gap-4 rounded-2xl border border-[#CBD5E1] bg-[#EEF2F6] px-4 py-3 text-left shadow-[0_3px_10px_rgba(15,23,42,0.05)] transition hover:bg-[#E3E9F0] hover:shadow-[0_5px_14px_rgba(15,23,42,0.08)]"
    >
      <span className="text-sm font-medium text-[#334155]">{label}</span>

      <div className="flex items-center gap-3">
        <Badge variant={value > 0 ? "warning" : "muted"}>{value}</Badge>
        <ArrowRight className="h-4 w-4 text-[#94A3B8]" />
      </div>
    </button>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#CBD5E1] bg-[#EEF2F6] p-4 shadow-[0_3px_10px_rgba(15,23,42,0.05)]">
      <p className="text-xs font-medium uppercase tracking-[0.06em] text-[#64748B]">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold text-[#0F172A]">{value}</p>
    </div>
  );
}

type SupportActionProps = {
  icon: ReactNode;
  title: string;
  description: string;
  onClick: () => void;
};

function SupportAction({
  icon,
  title,
  description,
  onClick,
}: SupportActionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-4 rounded-2xl border border-[#CBD5E1] bg-[#F8FAFC] px-4 py-3 text-left shadow-[0_3px_10px_rgba(15,23,42,0.05)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#EEF2F6] hover:shadow-[0_6px_16px_rgba(15,23,42,0.09)]"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#E8F2FB] text-[#2563EB]">
        {icon}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-[#0F172A]">
          {title}
        </span>
        <span className="block truncate text-xs text-[#64748B]">
          {description}
        </span>
      </span>

      <ArrowRight className="h-4 w-4 text-[#94A3B8]" />
    </button>
  );
}

function EmptyDashboardText({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#B8C4D1] bg-[#EEF2F6] px-4 py-8 text-center text-sm leading-6 text-[#64748B]">
      {children}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Skeleton className="h-4 w-28" />
          <Skeleton className="mt-3 h-12 w-80 max-w-full" />
          <Skeleton className="mt-4 h-5 w-[32rem] max-w-full" />
        </div>

        <Skeleton className="h-12 w-56 rounded-2xl" />
      </div>

      <div className="rounded-3xl border border-[#D7DEE8] bg-[#EEF2F6] p-5">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-32 rounded-3xl" />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardBody>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="mt-4 h-24 w-full rounded-2xl" />
            <Skeleton className="mt-3 h-24 w-full rounded-2xl" />
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="mt-4 h-12 w-full rounded-2xl" />
            <Skeleton className="mt-3 h-12 w-full rounded-2xl" />
            <Skeleton className="mt-3 h-12 w-full rounded-2xl" />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
