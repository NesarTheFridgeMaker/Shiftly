"use client";

import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { getBusinessId } from "@/lib/getBusinessId";
import { getBusiness } from "@/lib/getBusiness";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import CardBody from "@/components/ui/CardBody";
import PageHeader from "@/components/ui/PageHeader";
import Section from "@/components/ui/Section";
import TableSkeleton from "@/components/skeletons/TableSkeleton";
import { useToast } from "@/components/ui/ToastProvider";

type Employee = {
  id: string;
  name: string;
  account_status: string;
};

type Profile = {
  id: string;
  role: string;
  business_id: string;
  employee_id: string;
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

function formatDateForDatabase(date: Date) {
  return date.toLocaleDateString("en-CA");
}

function formatShiftDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatMinutes(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours <= 0) {
    return `${minutes} Min.`;
  }

  if (minutes === 0) {
    return `${hours} Std.`;
  }

  return `${hours} Std. ${minutes} Min.`;
}

function getShiftDurationText(startTime: string, endTime: string) {
  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [endHour, endMinute] = endTime.split(":").map(Number);

  let startTotal = startHour * 60 + startMinute;
  let endTotal = endHour * 60 + endMinute;

  if (endTotal <= startTotal) {
    endTotal += 24 * 60;
  }

  return formatMinutes(endTotal - startTotal);
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
      displayDate: date.toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }),
    };
  });
}

export default function EmployeeShiftsPage() {
  const { showToast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [employeeId, setEmployeeId] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [teamShifts, setTeamShifts] = useState<Shift[]>([]);
  const [selectedWeekStart, setSelectedWeekStart] = useState(getMonday(new Date()));

  async function loadEmployeeContext() {
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
        .select("id, role, business_id, employee_id")
        .eq("id", user.id)
        .single();

      if (profileError || !profile) {
        console.error(profileError);
        showToast({
          type: "error",
          title: "Profil nicht gefunden",
          description: "Bitte melde dich erneut an.",
        });
        window.location.href = "/login";
        return;
      }

      const typedProfile = profile as Profile;

      if (typedProfile.role !== "employee") {
        window.location.href = "/admin";
        return;
      }

      if (!typedProfile.employee_id) {
        showToast({
          type: "error",
          title: "Kein Mitarbeiter zugeordnet",
          description: "Diesem Benutzer ist kein Mitarbeiterprofil zugeordnet.",
        });
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
        showToast({
          type: "error",
          title: "Mitarbeiter konnte nicht geladen werden",
          description: "Bitte melde dich erneut an.",
        });
        window.location.href = "/login";
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
      setEmployee(employeeData as Employee);
      setEmployeeId(typedProfile.employee_id);

      await loadTeamShifts(selectedWeekStart);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadTeamShifts(weekStartDate = selectedWeekStart) {
    const businessId = await getBusinessId();

    if (!businessId) return;

    const weekDays = getWeekDays(weekStartDate);
    const start = weekDays[0].date;
    const end = weekDays[6].date;

    const { data, error } = await supabase
      .from("shifts")
      .select("id, employee_id, employee_name, shift_date, start_time, end_time, work_type_name")
      .eq("business_id", businessId)
      .eq("is_published", true)
      .gte("shift_date", start)
      .lte("shift_date", end)
      .order("shift_date", { ascending: true })
      .order("start_time", { ascending: true });

    if (error) {
      console.error(error);
      showToast({
        type: "error",
        title: "Schichten konnten nicht geladen werden",
        description: error.message,
      });
      return;
    }

    setTeamShifts((data || []) as Shift[]);
  }

  function goToPreviousWeek() {
    const newWeekStart = addDays(selectedWeekStart, -7);
    setSelectedWeekStart(newWeekStart);
    loadTeamShifts(newWeekStart);
  }

  function goToNextWeek() {
    const newWeekStart = addDays(selectedWeekStart, 7);
    setSelectedWeekStart(newWeekStart);
    loadTeamShifts(newWeekStart);
  }

  function goToCurrentWeek() {
    const newWeekStart = getMonday(new Date());
    setSelectedWeekStart(newWeekStart);
    loadTeamShifts(newWeekStart);
  }

  useEffect(() => {
    loadEmployeeContext();
  }, []);

  const weekDays = getWeekDays(selectedWeekStart);
  const todayDate = formatDateForDatabase(new Date());
  const weekStartText = formatShiftDate(weekDays[0].date);
  const weekEndText = formatShiftDate(weekDays[6].date);

  const teamEmployees = Array.from(
    new Map(
      teamShifts.map((shift) => [
        shift.employee_id,
        {
          id: shift.employee_id,
          name: shift.employee_name,
        },
      ])
    ).values()
  );

  const myShiftsThisWeek = teamShifts.filter((shift) => shift.employee_id === employeeId);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Meine Schichten"
          description="Dein Wochenplan wird geladen."
        />

        <Card>
          <CardBody>
            <TableSkeleton rows={7} columns={8} />
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      <div className="hidden lg:block">
        <PageHeader
          title="Meine Schichten"
          description={
            businessName
              ? `${businessName} · ${weekStartText} bis ${weekEndText}`
              : `${weekStartText} bis ${weekEndText}`
          }
        />
      </div>

      {/* Mobile/Desktop: Profil zuerst */}
      <Card hover>
        <CardBody>
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#2563EB] text-sm font-semibold text-white">
              {getInitials(employee?.name || "MA")}
            </div>

            <div className="min-w-0">
              <p className="text-sm font-medium text-[#64748B]">Dein Profil</p>
              <p className="mt-1 truncate text-xl font-semibold tracking-[-0.03em] text-[#0F172A]">
                {employee?.name || "Mitarbeiter"}
              </p>
              <p className="mt-1 text-sm text-[#64748B]">
                Im Wochenplan bist du blau markiert.
              </p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Woche wechseln: auf Mobile nebeneinander */}
      <div className="grid grid-cols-3 gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={goToPreviousWeek}
          fullWidth
          className="px-2 text-xs sm:text-sm"
        >
          <span className="hidden sm:inline">Vorherige Woche</span>
          <span className="sm:hidden">Vorherige</span>
        </Button>

        <Button
          type="button"
          variant="primary"
          onClick={goToCurrentWeek}
          fullWidth
          className="px-2 text-xs sm:text-sm"
        >
          <span className="hidden sm:inline">Aktuelle Woche</span>
          <span className="sm:hidden">Aktuell</span>
        </Button>

        <Button
          type="button"
          variant="secondary"
          onClick={goToNextWeek}
          fullWidth
          className="px-2 text-xs sm:text-sm"
        >
          <span className="hidden sm:inline">Nächste Woche</span>
          <span className="sm:hidden">Nächste</span>
        </Button>
      </div>

      <Section
        title="Wochenplan"
        description={
          businessName
            ? `${businessName} · ${weekStartText} bis ${weekEndText}`
            : `${weekStartText} bis ${weekEndText}`
        }
        bodyClassName="p-0 md:p-6"
      >
        {teamEmployees.length > 0 ? (
          <>
            {/* Mobile: App-optimierte Tageskarten */}
            <div className="space-y-4 p-4 lg:hidden">
              {weekDays.map((day) => {
                const shiftsForDay = teamShifts.filter(
                  (shift) => shift.shift_date === day.date
                );

                return (
                  <div
                    key={day.date}
                    className={[
                      "rounded-3xl border bg-white p-4 shadow-sm",
                      day.date === todayDate
                        ? "border-[#BFDBFE] bg-[#EFF6FF]/45"
                        : "border-[#E2E8F0]",
                    ].join(" ")}
                  >
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <p
                          className={[
                            "text-base font-semibold tracking-[-0.02em]",
                            day.date === todayDate
                              ? "text-[#2563EB]"
                              : "text-[#0F172A]",
                          ].join(" ")}
                        >
                          {day.label}
                        </p>
                        <p className="mt-0.5 text-sm text-[#64748B]">
                          {day.displayDate}
                        </p>
                      </div>

                      {day.date === todayDate && (
                        <Badge variant="primary" dot>
                          Heute
                        </Badge>
                      )}
                    </div>

                    {shiftsForDay.length > 0 ? (
                      <div className="flex flex-col gap-3">
                        {shiftsForDay.map((shift) => {
                          const isMyShift = shift.employee_id === employeeId;

                          return (
                            <div
                              key={shift.id}
                              className={[
                                "rounded-2xl border p-4 text-white shadow-[0_10px_24px_rgba(37,99,235,0.22)]",
                                isMyShift
                                  ? "border-[#93C5FD] bg-[#2563EB]"
                                  : "border-[#CBD5E1] bg-[#64748B]",
                              ].join(" ")}
                            >
                              <div className="mb-3 flex items-start justify-between gap-3">
                                <div className="flex min-w-0 items-center gap-3">
                                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 text-sm font-semibold text-white ring-1 ring-white/20">
                                    {getInitials(shift.employee_name)}
                                  </div>

                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold leading-5">
                                      {shift.employee_name}
                                    </p>
                                    <p className="mt-0.5 truncate text-xs text-white/75">
                                      {shift.work_type_name || "Schicht"}
                                    </p>
                                  </div>
                                </div>

                                {isMyShift && (
                                  <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-[#2563EB]">
                                    Du
                                  </span>
                                )}
                              </div>

                              <div className="rounded-xl bg-white/10 px-3 py-2 ring-1 ring-white/15">
                                <p className="text-base font-semibold tracking-[-0.01em]">
                                  {shift.start_time.slice(0, 5)} – {shift.end_time.slice(0, 5)} Uhr
                                </p>
                                <p className="mt-1 text-xs text-white/75">
                                  {getShiftDurationText(
                                    shift.start_time,
                                    shift.end_time
                                  )}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-4 py-5 text-center text-sm text-[#64748B]">
                        Keine Schichten eingetragen.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Desktop: Tabellenansicht bleibt erhalten */}
            <div className="hidden overflow-x-auto p-6 lg:block">
              <div className="min-w-[980px] overflow-hidden rounded-3xl border border-[#E2E8F0] bg-white">
                <div className="grid grid-cols-[220px_repeat(7,minmax(128px,1fr))] border-b border-[#E2E8F0] bg-[#F8FAFC]">
                  <div className="px-4 py-4 text-xs font-semibold uppercase tracking-[0.08em] text-[#64748B]">
                    Mitarbeiter
                  </div>

                  {weekDays.map((day) => (
                    <div
                      key={day.date}
                      className={[
                        "px-4 py-4 text-center",
                        day.date === todayDate ? "bg-[#EFF6FF]" : "",
                      ].join(" ")}
                    >
                      <p
                        className={[
                          "text-sm font-semibold text-[#0F172A]",
                          day.date === todayDate ? "text-[#2563EB]" : "",
                        ].join(" ")}
                      >
                        {day.label.slice(0, 2)}
                      </p>

                      <p className="mt-1 text-xs text-[#64748B]">
                        {day.displayDate}
                      </p>

                      {day.date === todayDate && (
                        <Badge variant="primary" className="mt-2">
                          Heute
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>

                <div>
                  {teamEmployees.map((teamEmployee) => (
                    <div
                      key={teamEmployee.id}
                      className="grid grid-cols-[220px_repeat(7,minmax(128px,1fr))] border-b border-[#F1F5F9] last:border-b-0"
                    >
                      <div className="flex items-center gap-3 border-r border-[#F1F5F9] px-4 py-4">
                        <div
                          className={[
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white",
                            teamEmployee.id === employeeId
                              ? "bg-[#2563EB]"
                              : "bg-[#64748B]",
                          ].join(" ")}
                        >
                          {getInitials(teamEmployee.name)}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[#0F172A]">
                            {teamEmployee.name}
                          </p>

                          {teamEmployee.id === employeeId && (
                            <p className="text-xs text-[#2563EB]">Du</p>
                          )}
                        </div>
                      </div>

                      {weekDays.map((day) => {
                        const shiftsForDay = teamShifts.filter(
                          (shift) =>
                            shift.employee_id === teamEmployee.id &&
                            shift.shift_date === day.date
                        );

                        return (
                          <div
                            key={day.date}
                            className={[
                              "min-h-[92px] border-r border-[#F1F5F9] px-3 py-4 last:border-r-0",
                              day.date === todayDate ? "bg-[#EFF6FF]/45" : "",
                            ].join(" ")}
                          >
                            {shiftsForDay.length > 0 && (
                              <div className="flex flex-col gap-2">
                                {shiftsForDay.map((shift) => (
                                  <div
                                    key={shift.id}
                                    className="rounded-2xl border border-[#93C5FD] bg-[#2563EB] px-3 py-2.5 text-white shadow-[0_10px_24px_rgba(37,99,235,0.22)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_32px_rgba(37,99,235,0.28)]"
                                  >
                                    <p className="text-sm font-semibold leading-5">
                                      {shift.start_time.slice(0, 5)} – {shift.end_time.slice(0, 5)}
                                    </p>

                                    <p className="mt-1 truncate text-xs font-medium text-white/85">
                                      {shift.work_type_name || "Schicht"}
                                    </p>

                                    <p className="mt-1 text-[11px] text-white/70">
                                      {getShiftDurationText(
                                        shift.start_time,
                                        shift.end_time
                                      )}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-3xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-6 py-12 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#E2E8F0] bg-white text-[#2563EB] shadow-sm">
              <CalendarDays className="h-5 w-5" />
            </div>

            <h3 className="text-xl font-semibold text-[#0F172A]">
              Kein Wochenplan vorhanden
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#64748B]">
              Für diese Woche wurden noch keine veröffentlichten Team-Schichten eingetragen.
            </p>
          </div>
        )}
      </Section>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card hover>
          <CardBody>
            <p className="text-sm font-medium text-[#64748B]">Diese Woche</p>
            <p className="mt-3 text-4xl font-light tracking-[-0.04em] text-[#0F172A]">
              {myShiftsThisWeek.length}
            </p>
            <p className="mt-2 text-sm text-[#64748B]">
              geplante Schichten
            </p>
          </CardBody>
        </Card>

        <Card hover>
          <CardBody>
            <p className="text-sm font-medium text-[#64748B]">Team</p>
            <p className="mt-3 text-4xl font-light tracking-[-0.04em] text-[#0F172A]">
              {teamEmployees.length}
            </p>
            <p className="mt-2 text-sm text-[#64748B]">
              Mitarbeiter im Plan
            </p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
