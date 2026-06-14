import { getBusinessDateKey } from "@/lib/time/businessTime";

export function getEasterSunday(year: number) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);

  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  return new Date(year, month - 1, day);
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function getGermanHolidays(year: number, federalState: string) {
  const easter = getEasterSunday(year);

  const holidays: Record<string, string> = {
    [`${year}-01-01`]: "Neujahr",
    [`${year}-05-01`]: "Tag der Arbeit",
    [`${year}-10-03`]: "Tag der Deutschen Einheit",
    [`${year}-12-25`]: "1. Weihnachtstag",
    [`${year}-12-26`]: "2. Weihnachtstag",

    [getBusinessDateKey(addDays(easter, -2))]: "Karfreitag",
    [getBusinessDateKey(addDays(easter, 1))]: "Ostermontag",
    [getBusinessDateKey(addDays(easter, 39))]: "Christi Himmelfahrt",
    [getBusinessDateKey(addDays(easter, 50))]: "Pfingstmontag",
  };

  if (["BW", "BY", "HE", "NW", "RP", "SL"].includes(federalState)) {
    holidays[getBusinessDateKey(addDays(easter, 60))] = "Fronleichnam";
  }

  if (["BW", "BY", "ST"].includes(federalState)) {
    holidays[`${year}-01-06`] = "Heilige Drei Könige";
  }

  if (["SL", "BY"].includes(federalState)) {
    holidays[`${year}-08-15`] = "Mariä Himmelfahrt";
  }

  if (["BW", "BY", "NW", "RP", "SL"].includes(federalState)) {
    holidays[`${year}-11-01`] = "Allerheiligen";
  }

  if (["BB", "MV", "SN", "ST", "TH"].includes(federalState)) {
    holidays[`${year}-10-31`] = "Reformationstag";
  }

  if (federalState === "SN") {
    holidays[getBusinessDateKey(addDays(easter, 60 + 153))] =
      "Buß- und Bettag";
  }

  if (federalState === "BE") {
    holidays[`${year}-03-08`] = "Internationaler Frauentag";
  }

  if (federalState === "TH") {
    holidays[`${year}-09-20`] = "Weltkindertag";
  }

  return holidays;
}

export function isGermanHoliday(date: Date, federalState: string) {
  const businessDate = new Date(date);
  const year = businessDate.getFullYear();

  const holidays = getGermanHolidays(year, federalState);
  const key = getBusinessDateKey(date);

  return Boolean(holidays[key]);
}