"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import PageHeader from "@/components/ui/PageHeader";
import Section from "@/components/ui/Section";
import StatCard from "@/components/ui/StatCard";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import StatsSkeleton from "@/components/skeletons/StatsSkeleton";
import TableSkeleton from "@/components/skeletons/TableSkeleton";
import { useToast } from "@/components/ui/ToastProvider";

type MonthOverviewRow = {
  payroll_period_id: string;
  period_year: number;
  period_month: number;
  period_status: "open" | "review" | "closed" | "reopened" | string;

  employee_id: string;
  employee_name: string;
  employee_account_status: string;
  employment_type: string | null;

  wage_type: "hourly" | "fixed_hourly" | "salary" | string;
  time_account_period: "none" | "weekly" | "monthly" | string;

  target_minutes: number;
  worked_minutes: number;
  credited_minutes: number;
  accountable_minutes: number;
  raw_difference_minutes: number;

  opening_balance_minutes: number;
  current_balance_minutes: number;
  carried_balance_minutes: number;
  payout_overtime_minutes: number;

  target_minutes_requires_review: boolean;

  hourly_rate: number | null;
  monthly_salary: number | null;
  hourly_allowance_rate: number | null;

  base_gross: number;
  hourly_allowance_gross: number;
  overtime_gross: number;

  night_surcharge_gross: number;
  sunday_surcharge_gross: number;
  holiday_surcharge_gross: number;
  other_surcharge_gross: number;
  total_surcharge_gross: number;

  estimated_gross: number;
};


type TimeEntryInspection = {
  entry_id: string;
  action: string;
  created_at: string;
  local_time: string;
  state_before: string;
  state_after: string;
  is_valid: boolean;
  issue: string | null;
};

type WorkDaySummary = {
  local_work_date: string;
  gross_minutes: number;
  break_minutes: number;
  net_minutes: number;
  session_count: number;
  has_conflict: boolean;
};

type TimesTab = "overview" | "entries";

function actionLabel(action: string) {
  if (action === "check_in") return "Eingestempelt";
  if (action === "check_out") return "Ausgestempelt";
  if (action === "break_start") return "Pause begonnen";
  if (action === "break_end") return "Pause beendet";
  if (action === "open_session") return "Offene Arbeitszeit";
  if (action === "open_break") return "Offene Pause";
  return action;
}

function stateLabel(state: string) {
  if (state === "off") return "Nicht eingestempelt";
  if (state === "working") return "Arbeitet";
  if (state === "break") return "In Pause";

  return state;
}

function actionBadgeVariant(
  action: string,
): "success" | "warning" | "primary" | "muted" {
  if (action === "check_in" || action === "break_end") return "success";
  if (action === "break_start") return "warning";
  if (action === "check_out") return "muted";
  return "warning";
}

function formatLocalTime(value: string | null | undefined) {
  if (!value) return "—";
  const timePart = value.split(/[ T]/)[1];
  return timePart ? timePart.slice(0, 5) : value;
}

function formatLocalDate(value: string) {
  const normalized = value.includes("T") ? value : `${value}T12:00:00`;
  return new Date(normalized).toLocaleDateString("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getLocalDatePart(value: string) {
  return value.split(/[ T]/)[0];
}

function isDateInSelectedMonth(dateValue: string, year: number, month: number) {
  return dateValue.startsWith(
    `${year}-${String(month).padStart(2, "0")}-`,
  );
}

function getBufferedMonthRange(year: number, month: number) {
  const from = new Date(Date.UTC(year, month - 1, 1));
  const to = new Date(Date.UTC(year, month, 1));
  from.setUTCDate(from.getUTCDate() - 1);
  to.setUTCDate(to.getUTCDate() + 1);

  return {
    from: from.toISOString(),
    to: to.toISOString(),
  };
}

function getIssueLabel(issue: string | null) {
  if (!issue) return null;
  if (issue.includes("missing check_out")) return "Ausstempeln fehlt";
  if (issue.includes("check_in while employee was already checked in")) {
    return "Doppeltes Einstempeln";
  }
  if (issue.includes("check_out without preceding check_in")) {
    return "Ausstempeln ohne Einstempeln";
  }
  if (issue.includes("break_start without active working state")) {
    return "Pausenbeginn ohne aktive Arbeitszeit";
  }
  if (issue.includes("break_end without active break")) {
    return "Pausenende ohne Pausenbeginn";
  }
  return issue;
}

function getEntryDateGroups(
  entries: TimeEntryInspection[],
  summaries: WorkDaySummary[],
) {
  const grouped = new Map<
    string,
    {
      date: string;
      entries: TimeEntryInspection[];
      summary: WorkDaySummary | null;
    }
  >();

  for (const summary of summaries) {
    grouped.set(summary.local_work_date, {
      date: summary.local_work_date,
      entries: [],
      summary,
    });
  }

  for (const entry of entries) {
    const localDate = getLocalDatePart(entry.local_time);
    const current = grouped.get(localDate) ?? {
      date: localDate,
      entries: [],
      summary: null,
    };

    current.entries.push(entry);
    grouped.set(localDate, current);
  }

  return Array.from(grouped.values()).sort((a, b) =>
  a.date.localeCompare(b.date),
  );
}

function getInitialMonth() {
  const now = new Date();

  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  };
}

function formatMonthLabel(year: number, month: number) {
  return new Date(year, month - 1, 1).toLocaleDateString("de-DE", {
    month: "long",
    year: "numeric",
  });
}

function formatMinutes(minutes: number | null | undefined) {
  const safeMinutes = Math.max(0, Math.round(minutes ?? 0));
  const hours = Math.floor(safeMinutes / 60);
  const rest = safeMinutes % 60;

  return `${hours}:${String(rest).padStart(2, "0")} h`;
}

function formatSignedMinutes(minutes: number | null | undefined) {
  const value = Math.round(minutes ?? 0);
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  const absolute = Math.abs(value);
  const hours = Math.floor(absolute / 60);
  const rest = absolute % 60;

  return `${sign}${hours}:${String(rest).padStart(2, "0")} h`;
}

function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0));
}

function wageTypeLabel(value: string) {
  if (value === "salary") return "Monatsgehalt";
  if (value === "fixed_hourly") return "Fixer Monatslohn auf Stundenbasis";
  if (value === "hourly") return "Stundenlohn";

  return value;
}

function employmentTypeLabel(value: string | null) {
  if (!value) return "Beschäftigungsart nicht hinterlegt";

  const normalized = value.toLowerCase();

  if (normalized === "full_time" || normalized === "vollzeit") {
    return "Vollzeit";
  }

  if (normalized === "part_time" || normalized === "teilzeit") {
    return "Teilzeit";
  }

  if (
    normalized === "mini_job" ||
    normalized === "minijob" ||
    normalized === "mini-job"
  ) {
    return "Minijob";
  }

  return value;
}

function periodStatusLabel(status: string) {
  if (status === "open") return "Offen";
  if (status === "review") return "In Prüfung";
  if (status === "closed") return "Abgeschlossen";
  if (status === "reopened") return "Wieder geöffnet";

  return status;
}

function periodStatusVariant(
  status: string,
): "success" | "warning" | "primary" | "muted" {
  if (status === "closed") return "success";
  if (status === "review") return "warning";
  if (status === "reopened") return "primary";

  return "muted";
}

function balanceTone(minutes: number) {
  if (minutes > 0) {
    return {
      text: "text-[#047857]",
      bg: "bg-[#ECFDF5]",
      border: "border-[#A7F3D0]",
    };
  }

  if (minutes < 0) {
    return {
      text: "text-[#B91C1C]",
      bg: "bg-[#FEF2F2]",
      border: "border-[#FECACA]",
    };
  }

  return {
    text: "text-[#475569]",
    bg: "bg-[#F8FAFC]",
    border: "border-[#E2E8F0]",
  };
}

export default function TimesPage() {
  const { showToast } = useToast();

  const initialMonth = getInitialMonth();

  const [year, setYear] = useState(initialMonth.year);
  const [month, setMonth] = useState(initialMonth.month);

  const [rows, setRows] = useState<MonthOverviewRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<TimesTab>("overview");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [timeEntries, setTimeEntries] = useState<TimeEntryInspection[]>([]);
  const [workDaySummaries, setWorkDaySummaries] = useState<WorkDaySummary[]>([]);
  const [isEntriesLoading, setIsEntriesLoading] = useState(false);

  async function loadOverview() {
    setIsLoading(true);

    const { data, error } = await supabase.rpc(
      "get_business_month_work_pay_overview",
      {
        p_year: year,
        p_month: month,
      },
    );

    if (error) {
      console.warn("MONTH OVERVIEW RPC ERROR:", error);

      showToast({
        type: "error",
        title: "Monatsübersicht konnte nicht geladen werden",
        description: error.message || "Bitte versuche es erneut.",
      });

      setRows([]);
      setIsLoading(false);
      return;
    }

    setRows((data || []) as MonthOverviewRow[]);
    setIsLoading(false);
  }

  useEffect(() => {
    void loadOverview();
  }, [year, month]);

  useEffect(() => {
    if (rows.length === 0) {
      setSelectedEmployeeId("");
      return;
    }

    if (
      !selectedEmployeeId ||
      !rows.some((row) => row.employee_id === selectedEmployeeId)
    ) {
      setSelectedEmployeeId(rows[0].employee_id);
    }
  }, [rows, selectedEmployeeId]);

  async function loadEmployeeEntries() {
    if (!selectedEmployeeId) {
      setTimeEntries([]);
      setWorkDaySummaries([]);
      return;
    }

    setIsEntriesLoading(true);

    try {
      const range = getBufferedMonthRange(year, month);

      const [entriesResult, workDaysResult] = await Promise.all([
        supabase.rpc("inspect_business_employee_time_entries", {
          p_employee_id: selectedEmployeeId,
          p_from: range.from,
          p_to: range.to,
        }),
        supabase.rpc("get_business_employee_work_days", {
          p_employee_id: selectedEmployeeId,
          p_from: range.from,
          p_to: range.to,
        }),
      ]);

      if (entriesResult.error) {
        console.error("TIME ENTRIES INSPECTION ERROR:", entriesResult.error);
        showToast({
          type: "error",
          title: "Stempelungen konnten nicht geladen werden",
          description: entriesResult.error.message || "Bitte versuche es erneut.",
        });
        setTimeEntries([]);
      } else {
        setTimeEntries(
          ((entriesResult.data || []) as TimeEntryInspection[]).filter((entry) =>
            isDateInSelectedMonth(
              getLocalDatePart(entry.local_time),
              year,
              month,
            ),
          ),
        );
      }

      if (workDaysResult.error) {
        console.error("WORK DAY SUMMARY ERROR:", workDaysResult.error);
        setWorkDaySummaries([]);
      } else {
        setWorkDaySummaries(
          ((workDaysResult.data || []) as WorkDaySummary[]).filter((summary) =>
            isDateInSelectedMonth(summary.local_work_date, year, month),
          ),
        );
      }
    } finally {
      setIsEntriesLoading(false);
    }
  }

  useEffect(() => {
    if (activeTab !== "entries") return;
    void loadEmployeeEntries();
  }, [activeTab, selectedEmployeeId, year, month]);

  function changeMonth(direction: number) {
    const date = new Date(year, month - 1, 1);
    date.setMonth(date.getMonth() + direction);

    setYear(date.getFullYear());
    setMonth(date.getMonth() + 1);
  }

  function goToCurrentMonth() {
    const now = new Date();

    setYear(now.getFullYear());
    setMonth(now.getMonth() + 1);
  }

  const filteredRows = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("de-DE");

    if (!query) {
      return rows;
    }

    return rows.filter((row) =>
      row.employee_name.toLocaleLowerCase("de-DE").includes(query),
    );
  }, [rows, search]);

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        acc.workedMinutes += Number(row.worked_minutes ?? 0);
        acc.baseGross += Number(row.base_gross ?? 0);
        acc.overtimeGross += Number(row.overtime_gross ?? 0);
        acc.surchargeGross += Number(row.total_surcharge_gross ?? 0);
        acc.estimatedGross += Number(row.estimated_gross ?? 0);

        return acc;
      },
      {
        workedMinutes: 0,
        baseGross: 0,
        overtimeGross: 0,
        surchargeGross: 0,
        estimatedGross: 0,
      },
    );
  }, [rows]);

  const periodStatus = rows[0]?.period_status ?? "open";

  const entryGroups = useMemo(
    () => getEntryDateGroups(timeEntries, workDaySummaries),
    [timeEntries, workDaySummaries],
  );

  const selectedEmployeeName =
    rows.find((row) => row.employee_id === selectedEmployeeId)?.employee_name ??
    "Mitarbeiter";

  const selectedMonthNetMinutes = workDaySummaries.reduce(
    (sum, day) => sum + Number(day.net_minutes ?? 0),
    0,
  );

  const selectedMonthBreakMinutes = workDaySummaries.reduce(
    (sum, day) => sum + Number(day.break_minutes ?? 0),
    0,
  );

  const selectedMonthConflictDays = workDaySummaries.filter(
    (day) => day.has_conflict,
  ).length;

  if (isLoading) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Zeiten & Löhne"
          description="Arbeitszeiten, Stempelungen, Stundenkonten und Bruttolöhne zentral im Überblick."
        />

        <StatsSkeleton />

        <Section
          title="Mitarbeiterübersicht"
          description="Zeit- und Vergütungssalden pro Mitarbeiter."
        >
          <TableSkeleton rows={8} columns={8} />
        </Section>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Zeiten & Löhne"
        description="Arbeitszeiten, Stempelungen, Stundenkonten und Bruttolöhne zentral im Überblick."
      />

      <div className="rounded-3xl border border-[#D7DEE8] bg-[#EEF2F6] p-2 shadow-[0_6px_18px_rgba(15,23,42,0.08)]">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={[
              "rounded-2xl border px-5 py-4 text-left transition-all duration-200",
              activeTab === "overview"
                ? "border-[#2563EB] bg-[#2563EB] text-white shadow-[0_10px_24px_rgba(37,99,235,0.20)]"
                : "border-transparent bg-[#E9EEF4] text-[#0F172A] shadow-[0_3px_9px_rgba(15,23,42,0.06)] hover:border-[#BFDBFE] hover:bg-[#E8F2FB]",
            ].join(" ")}
          >
            <span className="text-base font-semibold">Monatsübersicht</span>
            <p className={["mt-1 text-sm", activeTab === "overview" ? "text-white/80" : "text-[#64748B]"].join(" ")}>
              Soll, Ist, Stundenkonto, Zuschläge und Bruttolohn.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("entries")}
            className={[
              "rounded-2xl border px-5 py-4 text-left transition-all duration-200",
              activeTab === "entries"
                ? "border-[#2563EB] bg-[#2563EB] text-white shadow-[0_10px_24px_rgba(37,99,235,0.20)]"
                : "border-transparent bg-[#E9EEF4] text-[#0F172A] shadow-[0_3px_9px_rgba(15,23,42,0.06)] hover:border-[#BFDBFE] hover:bg-[#E8F2FB]",
            ].join(" ")}
          >
            <span className="text-base font-semibold">Stempelungen</span>
            <p className={["mt-1 text-sm", activeTab === "entries" ? "text-white/80" : "text-[#64748B]"].join(" ")}>
              Einzelne Stempelereignisse, Pausen und Konflikte je Mitarbeiter.
            </p>
          </button>
        </div>
      </div>

      <Section
        title={formatMonthLabel(year, month)}
        description="Wechsle zwischen Monaten. Offene Monate werden laufend aus der zentralen Payroll-Logik aktualisiert; abgeschlossene Monate bleiben eingefroren."
        action={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => changeMonth(-1)}
            >
              ← Vorheriger
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={goToCurrentMonth}
            >
              Aktueller Monat
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => changeMonth(1)}
            >
              Nächster →
            </Button>

            <Badge variant={periodStatusVariant(periodStatus)}>
              {periodStatusLabel(periodStatus)}
            </Badge>
          </div>
        }
      >
        {activeTab === "overview" ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-5">
          <StatCard
            title="Mitarbeiter"
            value={rows.length}
          />

          <StatCard
            title="Arbeitszeit"
            value={formatMinutes(totals.workedMinutes)}
          />

          <StatCard
            title="Grundvergütung"
            value={formatCurrency(totals.baseGross)}
          />

          <StatCard
            title="Zuschläge"
            value={formatCurrency(
              totals.surchargeGross + totals.overtimeGross,
            )}
          />

          <StatCard
            title="Bruttovergütung"
            value={formatCurrency(totals.estimatedGross)}
            badge="Gesamt"
            badgeVariant="primary"
          />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <StatCard
              title="Nettoarbeitszeit"
              value={formatMinutes(selectedMonthNetMinutes)}
            />
            <StatCard
              title="Pausenzeit"
              value={formatMinutes(selectedMonthBreakMinutes)}
            />
            <StatCard
              title="Konflikttage"
              value={selectedMonthConflictDays}
              badge={selectedMonthConflictDays > 0 ? "Prüfen" : "Sauber"}
              badgeVariant={selectedMonthConflictDays > 0 ? "warning" : "success"}
            />
          </div>
        )}
      </Section>

      {activeTab === "overview" && (
        <Section
        title="Mitarbeiterübersicht"
        description="Öffne einen Mitarbeiter, um Zeitkonto und Vergütungsbestandteile im Detail zu sehen."
        action={
          <div className="w-full sm:w-[280px]">
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#64748B]">
                ⌕
              </span>

              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Mitarbeiter suchen"
                className="h-10 w-full rounded-xl border border-transparent bg-[#E9EEF4] pl-9 pr-3 text-sm text-[#0F172A] outline-none transition placeholder:text-[#64748B] hover:bg-[#E3E9F0] focus:border-[#60A5FA] focus:bg-white focus:ring-4 focus:ring-[#DBEAFE]"
              />
            </div>
          </div>
        }
      >
        {filteredRows.length === 0 ? (
          <EmptyState
            title={
              search
                ? "Kein Mitarbeiter gefunden"
                : "Keine Daten für diesen Monat"
            }
            description={
              search
                ? "Passe deine Suche an."
                : "Für den ausgewählten Monat sind noch keine Mitarbeiter-Snapshots vorhanden."
            }
          />
        ) : (
          <div className="space-y-4">
            {filteredRows.map((row) => {
              const hasTimeAccount =
                row.time_account_period !== "none";

              const balance = Number(
                row.current_balance_minutes ?? 0,
              );

              const balanceStyle = balanceTone(balance);

              return (
                <details
                  key={row.employee_id}
                  className="overflow-hidden rounded-3xl border border-[#D8E0E9] bg-white shadow-[0_5px_16px_rgba(15,23,42,0.10)] transition hover:border-[#C8D3E0] hover:shadow-[0_7px_20px_rgba(15,23,42,0.13)]"
                >
                  <summary className="cursor-pointer list-none px-5 py-5">
                    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(220px,1.3fr)_repeat(5,minmax(130px,1fr))_auto] xl:items-center">
                      <div className="min-w-0">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#2563EB] text-sm font-semibold text-white shadow-[0_4px_10px_rgba(37,99,235,0.18)]">
                            {row.employee_name
                              .slice(0, 1)
                              .toUpperCase()}
                          </div>

                          <div className="min-w-0">
                            <h3 className="truncate text-base font-semibold text-[#0F172A]">
                              {row.employee_name}
                            </h3>

                            <p className="mt-1 truncate text-xs text-[#64748B]">
                              {wageTypeLabel(row.wage_type)} ·{" "}
                              {employmentTypeLabel(row.employment_type)}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#64748B]">
                          Soll
                        </p>
                        <p className="mt-1 text-sm font-semibold text-[#0F172A]">
                          {hasTimeAccount
                            ? formatMinutes(row.target_minutes)
                            : "Kein Stundenkonto"}
                        </p>
                      </div>

                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#64748B]">
                          Ist
                        </p>
                        <p className="mt-1 text-sm font-semibold text-[#0F172A]">
                          {formatMinutes(row.worked_minutes)}
                        </p>
                      </div>

                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#64748B]">
                          Monatsdifferenz
                        </p>
                        <p
                          className={`mt-1 text-sm font-semibold ${
                            !hasTimeAccount
                              ? "text-[#64748B]"
                              : row.raw_difference_minutes > 0
                                ? "text-[#047857]"
                                : row.raw_difference_minutes < 0
                                  ? "text-[#B91C1C]"
                                  : "text-[#475569]"
                          }`}
                        >
                          {hasTimeAccount
                            ? formatSignedMinutes(
                                row.raw_difference_minutes,
                              )
                            : "—"}
                        </p>
                      </div>

                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#64748B]">
                          Zuschläge
                        </p>
                        <p className="mt-1 text-sm font-semibold text-[#0F172A]">
                          {formatCurrency(
                            Number(row.total_surcharge_gross ?? 0) +
                              Number(row.overtime_gross ?? 0),
                          )}
                        </p>
                      </div>

                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#64748B]">
                          Bruttovergütung
                        </p>
                        <p className="mt-1 text-base font-bold text-[#0F172A]">
                          {formatCurrency(row.estimated_gross)}
                        </p>
                      </div>

                      <div className="flex justify-start xl:justify-end">
                        <Badge variant="primary">
                          Details
                        </Badge>
                      </div>
                    </div>
                  </summary>

                  <div className="border-t border-[#DCE3EC] bg-[#F8FAFC] px-5 py-5">
                    <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                      <div className="rounded-2xl border border-[#DCE3EC] bg-white p-5 shadow-[0_3px_10px_rgba(15,23,42,0.06)]">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#2563EB]">
                              Zeit
                            </p>

                            <h4 className="mt-1 text-lg font-semibold text-[#0F172A]">
                              Arbeitszeit & Stundenkonto
                            </h4>
                          </div>

                          {row.target_minutes_requires_review && (
                            <Badge variant="warning">
                              Sollzeit prüfen
                            </Badge>
                          )}
                        </div>

                        <div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-4">
                          <Metric
                            label="Sollzeit"
                            value={
                              hasTimeAccount
                                ? formatMinutes(row.target_minutes)
                                : "Kein Stundenkonto"
                            }
                          />

                          <Metric
                            label="Gearbeitet"
                            value={formatMinutes(row.worked_minutes)}
                          />

                          <Metric
                            label="Abwesenheit gutgeschrieben"
                            value={formatMinutes(row.credited_minutes)}
                          />

                          <Metric
                            label="Anrechenbar"
                            value={formatMinutes(row.accountable_minutes)}
                          />

                          <Metric
                            label="Monatsdifferenz"
                            value={
                              hasTimeAccount
                                ? formatSignedMinutes(
                                    row.raw_difference_minutes,
                                  )
                                : "—"
                            }
                            valueClassName={
                              !hasTimeAccount
                                ? "text-[#64748B]"
                                : row.raw_difference_minutes > 0
                                  ? "text-[#047857]"
                                  : row.raw_difference_minutes < 0
                                    ? "text-[#B91C1C]"
                                    : "text-[#0F172A]"
                            }
                          />

                          <Metric
                            label="Ausgezahlte Überstunden"
                            value={
                              hasTimeAccount
                                ? formatMinutes(
                                    row.payout_overtime_minutes,
                                  )
                                : "—"
                            }
                          />
                        </div>

                        <div className="mt-5 border-t border-[#E2E8F0] pt-5">
                          {hasTimeAccount ? (
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                              <div className="rounded-xl border border-[#DCE3EC] bg-[#F8FAFC] px-4 py-3">
                                <p className="text-xs text-[#64748B]">
                                  Startsaldo
                                </p>

                                <p className="mt-1 text-sm font-semibold text-[#0F172A]">
                                  {formatSignedMinutes(
                                    row.opening_balance_minutes,
                                  )}
                                </p>
                              </div>

                              <div className="rounded-xl border border-[#DCE3EC] bg-[#F8FAFC] px-4 py-3">
                                <p className="text-xs text-[#64748B]">
                                  Übertrag
                                </p>

                                <p className="mt-1 text-sm font-semibold text-[#0F172A]">
                                  {formatSignedMinutes(
                                    row.carried_balance_minutes,
                                  )}
                                </p>
                              </div>

                              <div
                                className={`rounded-xl border px-4 py-3 ${balanceStyle.bg} ${balanceStyle.border}`}
                              >
                                <p className="text-xs text-[#64748B]">
                                  Aktueller Stand
                                </p>

                                <p
                                  className={`mt-1 text-base font-bold ${balanceStyle.text}`}
                                >
                                  {formatSignedMinutes(balance)}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-4">
                              <p className="text-sm font-medium text-[#475569]">
                                Kein Stundenkonto aktiviert
                              </p>

                              <p className="mt-1 text-xs leading-5 text-[#64748B]">
                                Für diesen Mitarbeiter wird kein laufender
                                Stundenkontostand geführt.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-[#DCE3EC] bg-white p-5 shadow-[0_3px_10px_rgba(15,23,42,0.06)]">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#7C3AED]">
                            Vergütung
                          </p>

                          <h4 className="mt-1 text-lg font-semibold text-[#0F172A]">
                            Bruttovergütung
                          </h4>

                          <p className="mt-1 text-xs leading-5 text-[#64748B]">
                            Ohne Arbeitgeberanteile und sonstige
                            Lohnnebenkosten.
                          </p>
                        </div>

                        <div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-4">
                          <Metric
                            label="Grundvergütung"
                            value={formatCurrency(row.base_gross)}
                          />

                          <Metric
                            label="Stundenzulagen"
                            value={formatCurrency(
                              row.hourly_allowance_gross,
                            )}
                          />

                          <Metric
                            label="Überstunden"
                            value={formatCurrency(row.overtime_gross)}
                          />

                          <Metric
                            label="Nachtzuschläge"
                            value={formatCurrency(
                              row.night_surcharge_gross,
                            )}
                          />

                          <Metric
                            label="Sonntagszuschläge"
                            value={formatCurrency(
                              row.sunday_surcharge_gross,
                            )}
                          />

                          <Metric
                            label="Feiertagszuschläge"
                            value={formatCurrency(
                              row.holiday_surcharge_gross,
                            )}
                          />

                          <Metric
                            label="Sonstige Zuschläge"
                            value={formatCurrency(
                              row.other_surcharge_gross,
                            )}
                          />

                          <Metric
                            label="Zuschläge gesamt"
                            value={formatCurrency(
                              row.total_surcharge_gross,
                            )}
                          />
                        </div>

                        <div className="mt-5 border-t border-[#E2E8F0] pt-5">
                          <div className="flex items-end justify-between gap-4 rounded-2xl border border-[#DDD6FE] bg-[#F5F3FF] px-4 py-4">
                            <div>
                              <p className="text-xs font-medium text-[#6D28D9]">
                                Bruttovergütung gesamt
                              </p>

                              <p className="mt-1 text-xs text-[#7C3AED]">
                                Voraussichtlicher Monatswert
                              </p>
                            </div>

                            <p className="text-xl font-bold tracking-[-0.02em] text-[#5B21B6]">
                              {formatCurrency(row.estimated_gross)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </Section>
      )}

      {activeTab === "entries" && (
        <Section
          title="Stempelungen"
          description="Wähle einen Mitarbeiter und prüfe die einzelnen Stempelereignisse des ausgewählten Monats. Änderungen bleiben bewusst im Bereich „Korrekturen“."
          action={
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <select
                value={selectedEmployeeId}
                onChange={(event) => setSelectedEmployeeId(event.target.value)}
                className="h-10 min-w-[240px] rounded-xl border border-transparent bg-[#E9EEF4] px-3 text-sm text-[#0F172A] outline-none shadow-[0_3px_9px_rgba(15,23,42,0.05)] transition hover:bg-[#E3E9F0] focus:border-[#60A5FA] focus:bg-white focus:ring-4 focus:ring-[#DBEAFE]"
              >
                {rows.map((row) => (
                  <option key={row.employee_id} value={row.employee_id}>
                    {row.employee_name}
                  </option>
                ))}
              </select>

              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  window.location.href = "/admin/corrections";
                }}
              >
                Korrekturen öffnen
              </Button>
            </div>
          }
        >
          {!selectedEmployeeId ? (
            <EmptyState
              title="Kein Mitarbeiter verfügbar"
              description="Für den ausgewählten Monat ist kein Mitarbeiter in der Monatsübersicht vorhanden."
            />
          ) : isEntriesLoading ? (
            <TableSkeleton rows={6} columns={5} />
          ) : entryGroups.length === 0 ? (
            <EmptyState
              title="Keine Stempelungen vorhanden"
              description={`${selectedEmployeeName} hat im ausgewählten Monat keine Stempelereignisse.`}
            />
          ) : (
            <div className="space-y-5">
              <div className="rounded-3xl border border-[#CBD5E1] bg-[#EEF2F6] px-5 py-4 shadow-[0_6px_18px_rgba(15,23,42,0.07)]">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[#0F172A]">
                      {selectedEmployeeName}
                    </p>
                    <p className="mt-1 text-xs text-[#64748B]">
                      {formatMonthLabel(year, month)} · {timeEntries.length} Stempelereignis{timeEntries.length === 1 ? "" : "se"}
                    </p>
                  </div>

                  <Badge
                    variant={selectedMonthConflictDays > 0 ? "warning" : "success"}
                    dot
                  >
                    {selectedMonthConflictDays > 0
                      ? `${selectedMonthConflictDays} Konflikttag${selectedMonthConflictDays === 1 ? "" : "e"}`
                      : "Keine Konflikte"}
                  </Badge>
                </div>
              </div>

              {entryGroups.map((group) => (
                <div
                  key={group.date}
                  className={[
                    "overflow-hidden rounded-3xl border bg-white shadow-[0_6px_18px_rgba(15,23,42,0.09)]",
                    group.summary?.has_conflict
                      ? "border-[#F6D58B]"
                      : "border-[#D7DEE8]",
                  ].join(" ")}
                >
                  <div className="flex flex-col gap-4 border-b border-[#CBD5E1] bg-[#EEF2F6] px-5 py-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex flex-wrap items-center gap-3">
                      <div>
                        <p className="text-base font-semibold text-[#0F172A]">
                          {formatLocalDate(group.date)}
                        </p>
                        <p className="mt-1 text-xs text-[#64748B]">
                          {group.summary
                            ? `${group.summary.session_count} Arbeitssitzung${group.summary.session_count === 1 ? "" : "en"}`
                            : "Stempelereignisse"}
                        </p>
                      </div>

                      {group.summary?.has_conflict && (
                        <Badge variant="warning" dot>
                          Konflikt
                        </Badge>
                      )}
                    </div>

                    {group.summary && (
                      <div className="grid grid-cols-3 gap-2 sm:min-w-[360px]">
                        <div className="rounded-xl border border-[#D7DEE8] bg-white px-3 py-2">
                          <p className="text-[10px] font-medium uppercase tracking-[0.06em] text-[#64748B]">
                            Brutto
                          </p>
                          <p className="mt-1 text-xs font-semibold text-[#0F172A]">
                            {formatMinutes(group.summary.gross_minutes)}
                          </p>
                        </div>
                        <div className="rounded-xl border border-[#D7DEE8] bg-white px-3 py-2">
                          <p className="text-[10px] font-medium uppercase tracking-[0.06em] text-[#64748B]">
                            Pause
                          </p>
                          <p className="mt-1 text-xs font-semibold text-[#0F172A]">
                            {formatMinutes(group.summary.break_minutes)}
                          </p>
                        </div>
                        <div className="rounded-xl border border-[#D7DEE8] bg-white px-3 py-2">
                          <p className="text-[10px] font-medium uppercase tracking-[0.06em] text-[#64748B]">
                            Netto
                          </p>
                          <p className="mt-1 text-xs font-semibold text-[#047857]">
                            {formatMinutes(group.summary.net_minutes)}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="divide-y divide-[#E2E8F0]">
                    {group.entries.map((entry) => (
                      <div
                        key={`${entry.entry_id}-${entry.action}-${entry.local_time}`}
                        className={[
                          "flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between",
                          entry.is_valid ? "bg-white" : "bg-[#FFF8E8]",
                        ].join(" ")}
                      >
                        <div className="flex min-w-0 items-center gap-4">
                          <div className="w-14 shrink-0 text-lg font-semibold tracking-[-0.02em] text-[#0F172A]">
                            {formatLocalTime(entry.local_time)}
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge
                                variant={
                                  entry.is_valid
                                    ? actionBadgeVariant(entry.action)
                                    : "warning"
                                }
                                dot={!entry.is_valid}
                              >
                                {actionLabel(entry.action)}
                              </Badge>

                              {!entry.is_valid && (
                                <span className="text-xs font-medium text-[#B45309]">
                                  {getIssueLabel(entry.issue)}
                                </span>
                              )}
                            </div>

                            <p className="mt-1 text-xs text-[#64748B]">
                              {stateLabel(entry.state_before)} →{" "}
                              {stateLabel(entry.state_after)}
                            </p>
                          </div>
                        </div>

                        {!entry.is_valid && (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              window.location.href = "/admin/corrections";
                            }}
                          >
                            Prüfen
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  valueClassName = "text-[#0F172A]",
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-[#64748B]">
        {label}
      </p>

      <p className={`mt-1 truncate text-sm font-semibold ${valueClassName}`}>
        {value}
      </p>
    </div>
  );
}
