export const STANDARD_EMPLOYEE_LIMITS = [
  10,
  15,
  20,
  25,
  30,
  35,
  40,
  45,
] as const;

export const INDIVIDUAL_OFFER_FROM = 50;

export type StandardEmployeeLimit =
  (typeof STANDARD_EMPLOYEE_LIMITS)[number];

export type PlanKey =
  `employees_${StandardEmployeeLimit}`;

export type BillingPlan = {
  key: PlanKey;
  employeeLimit: StandardEmployeeLimit;
  stripePriceEnvironmentVariable: string;
};

export const BILLING_PLANS: BillingPlan[] =
  STANDARD_EMPLOYEE_LIMITS.map((employeeLimit) => ({
    key: `employees_${employeeLimit}` as PlanKey,
    employeeLimit,
    stripePriceEnvironmentVariable:
      `STRIPE_PRICE_EMPLOYEES_${employeeLimit}`,
  }));

export function getPlanByEmployeeLimit(
  employeeLimit: number
): BillingPlan | null {
  return (
    BILLING_PLANS.find(
      (plan) => plan.employeeLimit === employeeLimit
    ) ?? null
  );
}