import { BUSINESS_TIME_ZONE } from "@/lib/config/businessTime";

export function toBusinessDate(date: Date) {
  return new Date(
    date.toLocaleString("en-US", {
      timeZone: BUSINESS_TIME_ZONE,
    })
  );
}

export function getBusinessMinutesOfDay(date: Date) {
  const businessDate = toBusinessDate(date);

  return (
    businessDate.getHours() * 60 +
    businessDate.getMinutes()
  );
}

export function getBusinessDateKey(date: Date) {
  const businessDate = toBusinessDate(date);

  const year = businessDate.getFullYear();
  const month = String(businessDate.getMonth() + 1).padStart(2, "0");
  const day = String(businessDate.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function getBusinessDayStart(date: Date) {
  const businessDate = toBusinessDate(date);

  businessDate.setHours(0, 0, 0, 0);

  return businessDate;
}

export function getBusinessDayEnd(date: Date) {
  const start = getBusinessDayStart(date);
  const end = new Date(start);

  end.setDate(end.getDate() + 1);

  return end;
}

export function getDurationMinutes(start: Date, end: Date) {
  return Math.max(
    0,
    Math.round(
      (end.getTime() - start.getTime()) / 60000
    )
  );
}