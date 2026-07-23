"use client";

import type { ReactNode } from "react";

import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

export type EmployeeCardEmployee = {
  id: string;
  name: string;
  role: string;
  pin: string;
  account_status: string;
  monthly_target_hours: number;

  wage_type?: "hourly" | "fixed_hourly" | "salary";
  hourly_rate?: number | null;
  monthly_salary?: number | null;

  datev_personnel_number?: string | null;
  cost_center?: string | null;
};

type EmployeeCardProps = {
  employee: EmployeeCardEmployee;

  canEditPayroll: boolean;
  canEditLocationTracking: boolean;
  hasUnsavedMonthlyHours: boolean;

  inviteContent: ReactNode;
  notesContent: ReactNode;

  onMonthlyHoursChange: (value: number) => void;
  onSaveMonthlyHours: () => void;
  onToggleAccountStatus: () => void;
  onOpenLocationTracking: () => void;
  onOpenPayroll: () => void;
  onDelete: () => void;

  isExpanded: boolean;
  onToggleExpanded: () => void;
};

function formatAccountStatus(status: string) {
  if (status === "active") {
    return "Aktiv";
  }

  if (status === "inactive") {
    return "Deaktiviert";
  }

  return status;
}

function formatCompensation(employee: EmployeeCardEmployee) {
  if (employee.wage_type === "salary") {
    return `${employee.monthly_salary ?? 0} € / Monat`;
  }

  if (employee.wage_type === "fixed_hourly") {
    return `${employee.hourly_rate ?? 0} € / Std. (fix)`;
  }

  return `${employee.hourly_rate ?? 0} € / Std.`;
}

function getInitials(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return "?";
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export default function EmployeeCard({
  employee,
  canEditPayroll,
  canEditLocationTracking,
  hasUnsavedMonthlyHours,
  inviteContent,
  notesContent,
  onMonthlyHoursChange,
  onSaveMonthlyHours,
  onToggleAccountStatus,
  onOpenLocationTracking,
  onOpenPayroll,
  onDelete,
  isExpanded,
  onToggleExpanded,
}: EmployeeCardProps) {
  const isActive = employee.account_status === "active";

  return (
    <article
      className={[
        "overflow-hidden rounded-3xl border bg-white shadow-sm",
        "transition-[box-shadow,border-color] duration-300",
        "hover:border-[#93C5FD]",
        "hover:shadow-[0_14px_35px_rgba(15,23,42,0.08)]",
        isExpanded
          ? "col-span-full border-[#93C5FD]"
          : "border-[#E2E8F0]",
      ].join(" ")}
    >
      {/* Blauer Kartenkopf */}
      <div className="bg-[#005CA8] px-4 py-3.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/15 text-sm font-bold text-white">
              {getInitials(employee.name)}
            </div>

            <div className="min-w-0">
              <h3 className="truncate text-base font-semibold text-white">
                {employee.name}
              </h3>

              <p className="mt-0.5 truncate text-xs text-white/75">
                {employee.role}
              </p>
            </div>
          </div>

          <div className="shrink-0">
            <Badge variant={isActive ? "success" : "warning"} dot>
              {formatAccountStatus(employee.account_status)}
            </Badge>
          </div>
        </div>
      </div>

      {/* Kompakte Übersicht */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.06em] text-[#64748B]">
                Sollstunden
              </p>

              <p className="mt-0.5 text-sm font-semibold text-[#0F172A]">
                {employee.monthly_target_hours} Std. / Monat
              </p>
            </div>

            <div className="hidden h-8 w-px bg-[#E2E8F0] sm:block" />

            <div>
              <p className="text-xs font-medium uppercase tracking-[0.06em] text-[#64748B]">
                Vergütung
              </p>

              <p className="mt-0.5 max-w-48 truncate text-sm font-semibold text-[#0F172A]">
                {formatCompensation(employee)}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onToggleExpanded}
            aria-expanded={isExpanded}
            className={[
              "inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2",
              "text-sm font-semibold transition-colors",
              isExpanded
                ? "bg-[#E8F2FB] text-[#005CA8]"
                : "bg-[#F1F5F9] text-[#334155] hover:bg-[#E8F2FB] hover:text-[#005CA8]",
            ].join(" ")}
          >
            <span>
              {isExpanded ? "Details ausblenden" : "Details anzeigen"}
            </span>

            <svg
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden="true"
              className={[
                "h-4 w-4 transition-transform duration-300",
                isExpanded ? "rotate-180" : "",
              ].join(" ")}
            >
              <path
                d="M5 7.5 10 12.5 15 7.5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Animierte Detailansicht */}
      <div
        className={[
          "grid transition-[grid-template-rows,opacity] duration-300 ease-in-out",
          isExpanded
            ? "grid-rows-[1fr] opacity-100"
            : "grid-rows-[0fr] opacity-0",
        ].join(" ")}
        aria-hidden={!isExpanded}
      >
        <div className="overflow-hidden">
          <div className="border-t border-[#E2E8F0] bg-[#F8FAFC] px-4 py-5 md:px-6">
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(280px,0.7fr)]">
              {/* Linker Bereich */}
              <div className="space-y-5">
                <div>
                  <h4 className="text-sm font-bold text-[#0F172A]">
                    Mitarbeiterdaten
                  </h4>

                  <p className="mt-1 text-sm text-[#64748B]">
                    Grundlegende Personal- und Lohndaten des Mitarbeiters.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <div className="rounded-2xl border border-[#E2E8F0] bg-white p-3.5">
                    <p className="text-xs font-medium uppercase tracking-[0.06em] text-[#64748B]">
                      PIN
                    </p>

                    <p className="mt-1 font-mono text-sm font-semibold text-[#0F172A]">
                      {employee.pin}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[#E2E8F0] bg-white p-3.5">
                    <p className="text-xs font-medium uppercase tracking-[0.06em] text-[#64748B]">
                      Soll/Monat
                    </p>

                    <p className="mt-1 text-sm font-semibold text-[#0F172A]">
                      {employee.monthly_target_hours} Std.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[#E2E8F0] bg-white p-3.5">
                    <p className="text-xs font-medium uppercase tracking-[0.06em] text-[#64748B]">
                      DATEV-Nr.
                    </p>

                    <p className="mt-1 truncate text-sm font-semibold text-[#0F172A]">
                      {employee.datev_personnel_number || "—"}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[#E2E8F0] bg-white p-3.5">
                    <p className="text-xs font-medium uppercase tracking-[0.06em] text-[#64748B]">
                      Kostenstelle
                    </p>

                    <p className="mt-1 truncate text-sm font-semibold text-[#0F172A]">
                      {employee.cost_center || "—"}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
                  <p className="text-xs font-medium uppercase tracking-[0.06em] text-[#64748B]">
                    Vergütung
                  </p>

                  <p className="mt-1 text-sm font-semibold text-[#0F172A]">
                    {formatCompensation(employee)}
                  </p>
                </div>

                {canEditPayroll && (
                  <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
                    <label className="mb-2 block text-sm font-semibold text-[#334155]">
                      Monats-Sollstunden
                    </label>

                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Input
                        type="number"
                        min="0"
                        value={employee.monthly_target_hours}
                        onChange={(event) =>
                          onMonthlyHoursChange(Number(event.target.value))
                        }
                        className="flex-1"
                      />

                      {hasUnsavedMonthlyHours && (
                        <Button
                          variant="primary"
                          type="button"
                          onClick={onSaveMonthlyHours}
                        >
                          Speichern
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {canEditPayroll && (
                    <Button
                      variant="primary"
                      type="button"
                      fullWidth
                      onClick={onOpenPayroll}
                    >
                      Lohndaten
                    </Button>
                  )}

                  {canEditLocationTracking && (
                    <Button
                      variant="secondary"
                      type="button"
                      fullWidth
                      onClick={onOpenLocationTracking}
                    >
                      GPS-Einstellungen
                    </Button>
                  )}

                  <Button
                    variant="secondary"
                    type="button"
                    fullWidth
                    onClick={onToggleAccountStatus}
                  >
                    {isActive ? "Deaktivieren" : "Reaktivieren"}
                  </Button>
                </div>
              </div>

              {/* Rechter Bereich */}
              <div className="space-y-5">
                {inviteContent}

                {notesContent}

                <div className="rounded-2xl border border-[#FECACA] bg-[#FEF2F2] p-4">
                  <h4 className="text-sm font-semibold text-[#991B1B]">
                    Mitarbeiter löschen
                  </h4>

                  <p className="mt-1 text-xs leading-5 text-[#B91C1C]">
                    Der Mitarbeiter und die damit verknüpften Daten werden
                    dauerhaft entfernt.
                  </p>

                  <div className="mt-4">
                    <Button
                      variant="danger"
                      type="button"
                      fullWidth
                      onClick={onDelete}
                    >
                      Mitarbeiter löschen
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-center">
              <button
                type="button"
                onClick={onToggleExpanded}
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-[#005CA8] transition hover:bg-[#E8F2FB]"
              >
                <span>Details ausblenden</span>

                <svg
                  viewBox="0 0 20 20"
                  fill="none"
                  aria-hidden="true"
                  className="h-4 w-4 rotate-180"
                >
                  <path
                    d="M5 7.5 10 12.5 15 7.5"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}