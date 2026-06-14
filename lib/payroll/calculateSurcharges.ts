import type { WorkSession } from "./buildWorkSessions";
import { toBusinessDate } from "@/lib/time/businessTime";
import { isGermanHoliday } from "@/lib/time/isHoliday";

export type PayRule = {
  id: string;
  name: string;
  rule_type: string;
  starts_at: string | null;
  ends_at: string | null;
  percentage: number;
  datev_wage_type: string | null;
  active: boolean;
};

export type SurchargeResult = {
  ruleId: string;
  name: string;
  ruleType: string;
  minutes: number;
  hours: number;
  percentage: number;
  datevWageType: string | null;
};

function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function isMinuteInTimeWindow(
  minuteOfDay: number,
  startsAt: string,
  endsAt: string
) {
  const start = timeToMinutes(startsAt);
  const end = timeToMinutes(endsAt);

  if (start < end) {
    return minuteOfDay >= start && minuteOfDay < end;
  }

  return minuteOfDay >= start || minuteOfDay < end;
}

function getBusinessMinuteOfDay(date: Date) {
  const businessDate = toBusinessDate(date);

  return (
    businessDate.getHours() * 60 +
    businessDate.getMinutes()
  );
}

function isBusinessSunday(date: Date) {
  return (
    date.toLocaleDateString(
      "de-DE",
      {
        weekday: "long",
        timeZone: "Europe/Berlin",
      }
    ) === "Sonntag"
  );
}

export function calculateSurcharges(
  sessions: WorkSession[],
  rules: PayRule[],
  federalState = "BW"
): SurchargeResult[] {
  const activeRules = rules.filter((rule) => rule.active);

  const results: SurchargeResult[] = activeRules.map((rule) => ({
    ruleId: rule.id,
    name: rule.name,
    ruleType: rule.rule_type,
    minutes: 0,
    hours: 0,
    percentage: rule.percentage,
    datevWageType: rule.datev_wage_type,
  }));

  for (const session of sessions) {
    const startMs = session.start.getTime();
    const endMs = session.end.getTime();

    if (endMs <= startMs) continue;

    for (
      let currentMs = startMs;
      currentMs < endMs;
      currentMs += 60000
    ) {
      const currentDate = new Date(currentMs);
      const minuteOfDay = getBusinessMinuteOfDay(currentDate);

      for (const rule of activeRules) {
        const result = results.find((item) => item.ruleId === rule.id);
        if (!result) continue;

        if (rule.rule_type === "night") {
          if (!rule.starts_at || !rule.ends_at) continue;

          if (
            isMinuteInTimeWindow(
              minuteOfDay,
              rule.starts_at,
              rule.ends_at
            )
          ) {
            result.minutes += 1;
          }
        }

        if (rule.rule_type === "sunday") {
          if (isBusinessSunday(currentDate)) {
            result.minutes += 1;
          }
        }

        if (rule.rule_type === "holiday") {
  if (isGermanHoliday(currentDate, federalState)) {
    result.minutes += 1;
  }
}
      }
    }
  }

  return results.map((result) => ({
    ...result,
    hours: Math.round((result.minutes / 60) * 100) / 100,
  }));
}