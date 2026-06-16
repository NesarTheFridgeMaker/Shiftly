import type { SurchargeResult } from "./calculateSurcharges";

export type PayrollEmployee = {
  wage_type: "hourly" | "fixed_hourly" | "salary" | null;
  hourly_rate: number | null;
  monthly_salary: number | null;
  eligible_for_surcharges?: boolean | null;
};

export type PayrollPreview = {
  baseGross: number;
  nightGross: number;
  sundayGross: number;
  holidayGross: number;
  overtimeGross: number;
  surchargeGross: number;
  estimatedGross: number;
  calculatedHourlyRate: number;
};

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export function calculatePayrollPreview(params: {
  employee: PayrollEmployee | undefined;
  workHours: number;
  monthlyTargetHours: number;
  overtimeHours: number;
  surchargeResults: SurchargeResult[];
}): PayrollPreview {
  const {
    employee,
    workHours,
    monthlyTargetHours,
    overtimeHours,
    surchargeResults,
  } = params;

  if (!employee) {
    return {
      baseGross: 0,
      nightGross: 0,
      sundayGross: 0,
      holidayGross: 0,
      overtimeGross: 0,
      surchargeGross: 0,
      estimatedGross: 0,
      calculatedHourlyRate: 0,
    };
  }

  const hourlyRate = employee.hourly_rate ?? 0;

  const hasPlausibleMonthlyTargetHours =
  monthlyTargetHours >= 40;

const calculatedHourlyRate =
  employee.wage_type === "salary"
    ? employee.monthly_salary &&
      hasPlausibleMonthlyTargetHours
      ? employee.monthly_salary / monthlyTargetHours
      : 0
    : hourlyRate;

  const regularHours =
    employee.wage_type === "hourly" ||
    employee.wage_type === "fixed_hourly"
      ? Math.min(workHours, monthlyTargetHours)
      : 0;

  const baseGross =
    employee.wage_type === "salary"
      ? employee.monthly_salary ?? 0
      : regularHours * hourlyRate;

  const overtimeGross =
    employee.wage_type === "hourly" ||
    employee.wage_type === "fixed_hourly"
      ? overtimeHours * hourlyRate
      : 0;

  const canReceiveSurcharges =
    employee.eligible_for_surcharges !== false;

  const getSurchargeGross = (ruleType: string) => {
    if (!canReceiveSurcharges) return 0;

    const result = surchargeResults.find(
      (item) => item.ruleType === ruleType
    );

    if (!result) return 0;

    return (
      result.hours *
      calculatedHourlyRate *
      (result.percentage / 100)
    );
  };

  const nightGross = getSurchargeGross("night");
  const sundayGross = getSurchargeGross("sunday");
  const holidayGross = getSurchargeGross("holiday");

  const surchargeGross =
    nightGross + sundayGross + holidayGross;

  const estimatedGross =
    baseGross + overtimeGross + surchargeGross;

  return {
    baseGross: roundMoney(baseGross),
    nightGross: roundMoney(nightGross),
    sundayGross: roundMoney(sundayGross),
    holidayGross: roundMoney(holidayGross),
    overtimeGross: roundMoney(overtimeGross),
    surchargeGross: roundMoney(surchargeGross),
    estimatedGross: roundMoney(estimatedGross),
    calculatedHourlyRate: roundMoney(calculatedHourlyRate),
  };
}