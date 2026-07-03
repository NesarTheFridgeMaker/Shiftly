"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Headphones,
  Mail,
  MessageSquare,
  PlayCircle,
  Users,
  Video,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { getBusinessId } from "@/lib/getBusinessId";
import Card from "@/components/ui/Card";
import CardHeader from "@/components/ui/CardHeader";
import CardBody from "@/components/ui/CardBody";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

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
  const [businessName, setBusinessName] = useState("");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [myShifts, setMyShifts] = useState<Shift[]>([]);
  const [adminEmployeeId, setAdminEmployeeId] = useState("");
  const [adminName, setAdminName] = useState("");
  const [workTypesCount, setWorkTypesCount] = useState(0);
  const [shiftTemplatesCount, setShiftTemplatesCount] = useState(0);
  const [payRulesCount, setPayRulesCount] = useState(0);
  const [timeEntriesCount, setTimeEntriesCount] = useState(0);

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

      const { data: employeeData } = await supabase
        .from("employees")
        .select("name")
        .eq("id", data.employee_id)
        .single();

      if (employeeData?.name) {
        setAdminName(employeeData.name);
      }
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

  async function loadBusinessName() {
    const businessId = await getBusinessId();

    if (!businessId) return;

    const { data } = await supabase
      .from("businesses")
      .select("name")
      .eq("id", businessId)
      .single();

    if (data) {
      setBusinessName(data.name);
    }
  }

  async function loadOnboardingStatus() {
    const businessId = await getBusinessId();

    if (!businessId) return;

    const [
      workTypesResult,
      shiftTemplatesResult,
      payRulesResult,
      timeEntriesResult,
    ] = await Promise.all([
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
    ]);

    if (!workTypesResult.error) {
      setWorkTypesCount(workTypesResult.count ?? 0);
    }

    if (!shiftTemplatesResult.error) {
      setShiftTemplatesCount(shiftTemplatesResult.count ?? 0);
    }

    if (!payRulesResult.error) {
      setPayRulesCount(payRulesResult.count ?? 0);
    }

    if (!timeEntriesResult.error) {
      setTimeEntriesCount(timeEntriesResult.count ?? 0);
    }
  }

  useEffect(() => {
    loadEmployees();
    loadShifts();
    loadAdminProfile();
    loadBusinessName();
    loadOnboardingStatus();
  }, []);

  function formatShiftDate(dateString: string) {
    return new Date(dateString).toLocaleDateString("de-DE", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

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

  const activeEmployees = employees.filter(
    (employee) => employee.status === "checked_in"
  );

  const employeesOnBreak = employees.filter(
    (employee) => employee.status === "on_break"
  );

  const todayShiftCount = shifts.length;

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
      done: shifts.length > 0,
      href: "/admin/schedule",
    },
    {
      title: "Terminal einrichten & testen",
      description: "Öffne den Kiosk und teste eine Stempelung.",
      done: timeEntriesCount > 0,
      href: "/kiosk",
    },
    {
      title: "Ersten Export durchführen",
      description: "Exportiere Arbeitszeiten für deine Lohnabrechnung.",
      done: false,
      href: "/admin/time-entries",
    },
  ];

  const completedChecklistItems = checklistItems.filter((item) => item.done).length;
  const onboardingProgress = Math.round(
    (completedChecklistItems / checklistItems.length) * 100
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-[2.4rem] font-light leading-tight tracking-[-0.04em] text-[#111827]">
            {getGreeting()}{adminName ? `, ${adminName.split(" ")[0]}` : ""}! 👋
          </h1>

          <p className="mt-2 text-sm leading-6 text-[#6B7280]">
            {businessName
              ? `Hier ist die Übersicht für ${businessName}.`
              : "Hier ist alles im Überblick."}
          </p>
        </div>

        <div className="inline-flex items-center gap-2 rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm text-[#6B7280] shadow-[0_10px_24px_rgba(17,24,39,0.04)]">
          <CalendarDays className="h-4 w-4 text-[#2563EB]" />
          {getTodayLabel()}
        </div>
      </div>

      <section className="relative overflow-hidden rounded-[32px] border border-[#BFDBFE] bg-white shadow-[0_20px_60px_rgba(37,99,235,0.10)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(37,99,235,0.18),transparent_35%),linear-gradient(120deg,#FFFFFF_0%,#EFF6FF_100%)]" />
        <div className="relative grid grid-cols-1 gap-8 p-8 lg:grid-cols-[1.1fr_0.9fr] lg:p-10">
          <div className="flex flex-col justify-center">
            <Badge variant="primary" className="w-fit">
              Willkommen bei Dipera
            </Badge>

            <h2 className="mt-5 max-w-2xl text-4xl font-light leading-tight tracking-[-0.04em] text-[#111827] lg:text-5xl">
              Vereinfache deine Personalplanung & Zeiterfassung
            </h2>

            <p className="mt-5 max-w-xl text-base leading-7 text-[#4B5563]">
              Verwalte Mitarbeiter, Schichten und Arbeitszeiten effizient an einem
              Ort – ruhig, übersichtlich und startklar für deinen Betrieb.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                variant="primary"
                onClick={() => {}}
                className="h-12 rounded-2xl px-6"
              >
                <Video className="h-5 w-5" />
                Anleitungen & Video-Tutorials
                <ArrowRight className="h-4 w-4" />
              </Button>

              <Button
                type="button"
                variant="secondary"
                onClick={() => {}}
                className="h-12 rounded-2xl px-6"
              >
                <Headphones className="h-5 w-5 text-[#2563EB]" />
                Kontakt & Support
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="relative hidden min-h-[260px] items-end justify-center lg:flex">
            <div className="absolute right-0 top-0 h-28 w-28 rounded-full bg-[#DBEAFE] blur-2xl" />
            <div className="absolute bottom-0 right-6 h-36 w-20 rounded-t-full bg-[#DCFCE7] opacity-70" />

            <div className="relative w-full max-w-md rounded-[28px] border border-[#CBD5E1] bg-[#0F172A] p-3 shadow-[0_30px_70px_rgba(15,23,42,0.28)]">
              <div className="rounded-[20px] bg-white p-4">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <div className="h-3 w-20 rounded-full bg-[#2563EB]" />
                    <div className="mt-2 h-2 w-32 rounded-full bg-[#E5E7EB]" />
                  </div>
                  <div className="flex gap-1">
                    <span className="h-2 w-2 rounded-full bg-[#CBD5E1]" />
                    <span className="h-2 w-2 rounded-full bg-[#CBD5E1]" />
                    <span className="h-2 w-2 rounded-full bg-[#CBD5E1]" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-2xl bg-[#EFF6FF] p-3">
                    <div className="h-8 w-8 rounded-xl bg-[#2563EB]" />
                    <div className="mt-3 h-2 w-14 rounded-full bg-[#BFDBFE]" />
                  </div>
                  <div className="rounded-2xl bg-[#F0FDF4] p-3">
                    <div className="h-8 w-8 rounded-xl bg-[#16A34A]" />
                    <div className="mt-3 h-2 w-14 rounded-full bg-[#BBF7D0]" />
                  </div>
                  <div className="rounded-2xl bg-[#FFF7ED] p-3">
                    <div className="h-8 w-8 rounded-xl bg-[#F59E0B]" />
                    <div className="mt-3 h-2 w-14 rounded-full bg-[#FED7AA]" />
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-[#E5E7EB] p-3">
                  <div className="mb-3 flex items-end gap-2">
                    {[36, 54, 42, 68, 58, 82, 74].map((height, index) => (
                      <div
                        key={index}
                        className="w-full rounded-t-lg bg-[#2563EB]/80"
                        style={{ height }}
                      />
                    ))}
                  </div>
                  <div className="h-2 w-full rounded-full bg-[#E5E7EB]" />
                </div>
              </div>
            </div>

            <div className="absolute bottom-6 right-0 w-28 rounded-[24px] border border-[#DBEAFE] bg-white p-3 shadow-[0_20px_45px_rgba(37,99,235,0.18)]">
              <div className="mx-auto h-9 w-9 rounded-2xl bg-[#2563EB]" />
              <div className="mt-3 h-2 rounded-full bg-[#E5E7EB]" />
              <div className="mt-2 h-2 w-16 rounded-full bg-[#E5E7EB]" />
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={<Users className="h-6 w-6" />}
          title="Mitarbeiter"
          value={employees.length}
          subtitle="Aktive Konten"
          iconClassName="bg-[#EFF6FF] text-[#2563EB]"
        />

        <KpiCard
          icon={<Clock3 className="h-6 w-6" />}
          title="Heute eingestempelt"
          value={activeEmployees.length}
          subtitle={`${employeesOnBreak.length} aktuell in Pause`}
          iconClassName="bg-[#F0FDF4] text-[#16A34A]"
        />

        <KpiCard
          icon={<CalendarDays className="h-6 w-6" />}
          title="Geplante Schichten"
          value={todayShiftCount}
          subtitle="Heute"
          iconClassName="bg-[#F5F3FF] text-[#7C3AED]"
        />

        <KpiCard
          icon={<MessageSquare className="h-6 w-6" />}
          title="Offene Aufgaben"
          value={checklistItems.filter((item) => !item.done).length}
          subtitle="Einrichtung & Prüfung"
          iconClassName="bg-[#FFF7ED] text-[#F97316]"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {adminEmployeeId && (
          <Card>
            <CardHeader
              title="Meine Schichten"
              description="Deine nächsten geplanten Einsätze."
            />

            <CardBody>
              {myShifts.length > 0 ? (
                <div className="divide-y divide-[#E5E7EB]">
                  {myShifts.map((shift) => (
                    <div
                      key={shift.id}
                      className="flex flex-col gap-1 py-4 first:pt-0 last:pb-0 xl:flex-row xl:items-center xl:justify-between"
                    >
                      <span className="text-sm font-medium text-[#111827]">
                        {formatShiftDate(shift.shift_date)}
                      </span>

                      <span className="text-sm text-[#6B7280]">
                        {shift.start_time.slice(0, 5)} – {" "}
                        {shift.end_time.slice(0, 5)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[#6B7280]">
                  Für dich sind keine kommenden Schichten eingetragen.
                </p>
              )}
            </CardBody>
          </Card>
        )}

        <Card>
          <CardHeader
            title="Wer arbeitet heute?"
            description="Alle für heute geplanten Schichten."
          />

          <CardBody>
            {shifts.length > 0 ? (
              <div className="divide-y divide-[#E5E7EB]">
                {shifts.map((shift) => (
                  <div
                    key={shift.id}
                    className="flex flex-col gap-1 py-4 first:pt-0 last:pb-0 xl:flex-row xl:items-center xl:justify-between"
                  >
                    <span className="text-sm font-medium text-[#111827]">
                      {shift.employee_name}
                    </span>

                    <span className="text-sm text-[#6B7280]">
                      {shift.start_time.slice(0, 5)} – {" "}
                      {shift.end_time.slice(0, 5)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#6B7280]">
                Für heute sind keine Schichten eingetragen.
              </p>
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
            <div className="mb-5 rounded-2xl bg-[#F8FAFC] p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-[#111827]">
                    Einrichtung: {completedChecklistItems} von {checklistItems.length} Schritten erledigt
                  </p>
                  <p className="mt-1 text-xs text-[#6B7280]">
                    Die Liste aktualisiert sich automatisch anhand deiner echten Betriebsdaten.
                  </p>
                </div>

                <Badge variant={onboardingProgress === 100 ? "success" : "primary"}>
                  {onboardingProgress} %
                </Badge>
              </div>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#E5E7EB]">
                <div
                  className="h-full rounded-full bg-[#2563EB] transition-all"
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
                  className="flex w-full items-center gap-4 rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-left transition hover:bg-[#F8FAFC]"
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${
                      item.done
                        ? "border-[#16A34A] bg-[#DCFCE7] text-[#16A34A]"
                        : "border-[#CBD5E1] bg-white text-[#94A3B8]"
                    }`}
                  >
                    {item.done ? <CheckCircle2 className="h-5 w-5" /> : index + 1}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-[#111827]">
                      {item.title}
                    </span>
                    <span className="block truncate text-xs text-[#6B7280]">
                      {item.description}
                    </span>
                  </span>

                  <Badge variant={item.done ? "success" : "muted"}>
                    {item.done ? "Erledigt" : "Ausstehend"}
                  </Badge>

                  <ArrowRight className="h-4 w-4 text-[#94A3B8]" />
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {}}
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
              />
              <SupportAction
                icon={<PlayCircle className="h-5 w-5" />}
                title="Video-Tutorials"
                description="Kurze Videos zu allen wichtigen Funktionen."
              />
              <SupportAction
                icon={<Mail className="h-5 w-5" />}
                title="E-Mail Support"
                description="support@dipera.de"
              />
              <SupportAction
                icon={<MessageSquare className="h-5 w-5" />}
                title="Feedback senden"
                description="Deine Meinung hilft uns, Dipera zu verbessern."
              />
            </div>

            <div className="mt-5 rounded-2xl bg-[#EFF6FF] px-4 py-3 text-sm text-[#1E40AF]">
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
};

function KpiCard({ icon, title, value, subtitle, iconClassName }: KpiCardProps) {
  return (
    <Card>
      <CardBody>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className={`flex h-14 w-14 items-center justify-center rounded-2xl ${iconClassName}`}
            >
              {icon}
            </div>

            <div>
              <p className="text-sm font-medium text-[#374151]">{title}</p>
              <p className="mt-1 text-3xl font-light tracking-[-0.04em] text-[#111827]">
                {value}
              </p>
              <p className="mt-1 text-xs text-[#6B7280]">{subtitle}</p>
            </div>
          </div>

          <ArrowRight className="hidden h-5 w-5 text-[#94A3B8] sm:block" />
        </div>
      </CardBody>
    </Card>
  );
}

type SupportActionProps = {
  icon: ReactNode;
  title: string;
  description: string;
};

function SupportAction({ icon, title, description }: SupportActionProps) {
  return (
    <button
      type="button"
      onClick={() => {}}
      className="flex w-full items-center gap-4 rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-left transition hover:bg-[#F8FAFC]"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#2563EB]">
        {icon}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-[#111827]">
          {title}
        </span>
        <span className="block truncate text-xs text-[#6B7280]">
          {description}
        </span>
      </span>

      <ArrowRight className="h-4 w-4 text-[#94A3B8]" />
    </button>
  );
}
