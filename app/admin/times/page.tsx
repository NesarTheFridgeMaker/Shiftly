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

  if (isLoading) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Arbeitszeiten & Bruttovergütung"
          description="Monatliche Übersicht über Arbeitszeiten, Stundenkonten und Bruttovergütung aller Mitarbeiter."
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
        title="Arbeitszeiten & Bruttovergütung"
        description="Monatliche Übersicht über Arbeitszeiten, Stundenkonten und Bruttovergütung aller Mitarbeiter."
      />

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
      </Section>

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
