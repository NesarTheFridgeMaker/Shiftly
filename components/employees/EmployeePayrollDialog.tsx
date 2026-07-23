"use client";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";

export type WageType = "hourly" | "fixed_hourly" | "salary";

type EmployeePayrollDialogProps = {
  isOpen: boolean;
  employeeName: string;

  wageType: WageType;
  hourlyRate: string;
  monthlySalary: string;
  datevPersonnelNumber: string;
  costCenter: string;
  eligibleForSurcharges: boolean;

  onWageTypeChange: (value: WageType) => void;
  onHourlyRateChange: (value: string) => void;
  onMonthlySalaryChange: (value: string) => void;
  onDatevPersonnelNumberChange: (value: string) => void;
  onCostCenterChange: (value: string) => void;
  onEligibleForSurchargesChange: (value: boolean) => void;

  onClose: () => void;
  onSave: () => void | Promise<void>;
};

export default function EmployeePayrollDialog({
  isOpen,
  employeeName,
  wageType,
  hourlyRate,
  monthlySalary,
  datevPersonnelNumber,
  costCenter,
  eligibleForSurcharges,
  onWageTypeChange,
  onHourlyRateChange,
  onMonthlySalaryChange,
  onDatevPersonnelNumberChange,
  onCostCenterChange,
  onEligibleForSurchargesChange,
  onClose,
  onSave,
}: EmployeePayrollDialogProps) {
  if (!isOpen) {
    return null;
  }

  const usesHourlyRate =
    wageType === "hourly" || wageType === "fixed_hourly";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0F172A]/50 px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="employee-payroll-dialog-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="max-h-full w-full max-w-2xl overflow-y-auto rounded-3xl border border-[#E2E8F0] bg-white shadow-[0_24px_80px_rgba(15,23,42,0.24)]">
        <div className="flex items-start justify-between gap-4 border-b border-[#E2E8F0] px-5 py-5 sm:px-6">
          <div>
            <h2
              id="employee-payroll-dialog-title"
              className="text-xl font-bold text-[#0F172A]"
            >
              Lohndaten bearbeiten
            </h2>

            <p className="mt-1 text-sm text-[#64748B]">
              Lohndaten von {employeeName}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fenster schließen"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#E2E8F0] bg-white text-xl text-[#64748B] transition hover:bg-[#F8FAFC] hover:text-[#0F172A]"
          >
            ×
          </button>
        </div>

        <div className="space-y-6 px-5 py-6 sm:px-6">
          <div>
            <label className="mb-2 block text-sm font-semibold text-[#334155]">
              Vergütungsart
            </label>

            <Select
  value={wageType}
  onChange={(event) =>
    onWageTypeChange(event.target.value as WageType)
  }
  options={[
    {
      value: "hourly",
      label: "Stundenlohn",
    },
    {
      value: "fixed_hourly",
      label: "Fester Stundenlohn",
    },
    {
      value: "salary",
      label: "Monatsgehalt",
    },
  ]}
/>

            <p className="mt-2 text-xs leading-5 text-[#64748B]">
              Die Vergütungsart bestimmt, welcher Lohnwert für die
              Lohnvorbereitung verwendet wird.
            </p>
          </div>

          {usesHourlyRate ? (
            <div>
              <label className="mb-2 block text-sm font-semibold text-[#334155]">
                Stundenlohn in Euro
              </label>

              <Input
                type="text"
                inputMode="decimal"
                value={hourlyRate}
                onChange={(event) =>
                  onHourlyRateChange(event.target.value)
                }
                placeholder="Zum Beispiel 14,50"
              />
            </div>
          ) : (
            <div>
              <label className="mb-2 block text-sm font-semibold text-[#334155]">
                Monatsgehalt in Euro
              </label>

              <Input
                type="text"
                inputMode="decimal"
                value={monthlySalary}
                onChange={(event) =>
                  onMonthlySalaryChange(event.target.value)
                }
                placeholder="Zum Beispiel 2800,00"
              />
            </div>
          )}

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-[#334155]">
                DATEV-Personalnummer
              </label>

              <Input
                type="text"
                value={datevPersonnelNumber}
                onChange={(event) =>
                  onDatevPersonnelNumberChange(event.target.value)
                }
                placeholder="Zum Beispiel 10001"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-[#334155]">
                Kostenstelle
              </label>

              <Input
                type="text"
                value={costCenter}
                onChange={(event) =>
                  onCostCenterChange(event.target.value)
                }
                placeholder="Zum Beispiel 101"
              />
            </div>
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
            <input
              type="checkbox"
              checked={eligibleForSurcharges}
              onChange={(event) =>
                onEligibleForSurchargesChange(event.target.checked)
              }
              className="mt-1 h-4 w-4 shrink-0 rounded border-[#CBD5E1] accent-[#005CA8]"
            />

            <span>
              <span className="block text-sm font-semibold text-[#0F172A]">
                Zuschläge berücksichtigen
              </span>

              <span className="mt-1 block text-xs leading-5 text-[#64748B]">
                Nacht-, Sonn- und Feiertagszuschläge werden für diesen
                Mitarbeiter in der Lohnvorbereitung berücksichtigt.
              </span>
            </span>
          </label>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-[#E2E8F0] bg-[#F8FAFC] px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
          <Button
            variant="secondary"
            type="button"
            onClick={onClose}
          >
            Abbrechen
          </Button>

          <Button
            variant="primary"
            type="button"
            onClick={onSave}
          >
            Lohndaten speichern
          </Button>
        </div>
      </div>
    </div>
  );
}