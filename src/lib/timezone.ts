/**
 * Timezone helpers pinned to Africa/Lagos.
 *
 * Nigeria observes West Africa Time (WAT, UTC+01:00) year-round with no
 * daylight-saving changes, so a fixed +01:00 offset produces exact boundaries.
 */

export const LAGOS_TIMEZONE = "Africa/Lagos";
export const LAGOS_OFFSET = "+01:00";

const formatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: LAGOS_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  weekday: "short",
});

function lagosParts(date: Date): { y: string; m: string; d: string; weekday: number } {
  const parts = formatter.formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return {
    y: get("year"),
    m: get("month"),
    d: get("day"),
    weekday: weekdayMap[get("weekday")] ?? 0,
  };
}

function atLagosMidnight(y: string, m: string, d: string): Date {
  return new Date(`${y}-${m}-${d}T00:00:00${LAGOS_OFFSET}`);
}

export function startOfLagosDay(date: Date = new Date()): Date {
  const { y, m, d } = lagosParts(date);
  return atLagosMidnight(y, m, d);
}

export function endOfLagosDay(date: Date = new Date()): Date {
  const start = startOfLagosDay(date);
  return new Date(start.getTime() + 24 * 60 * 60 * 1000);
}

export function startOfLagosWeek(date: Date = new Date()): Date {
  const { y, m, d, weekday } = lagosParts(date);
  const startOfDay = atLagosMidnight(y, m, d);
  // Week starts on Monday.
  const diff = (weekday + 6) % 7;
  return new Date(startOfDay.getTime() - diff * 24 * 60 * 60 * 1000);
}

export function endOfLagosWeek(date: Date = new Date()): Date {
  const start = startOfLagosWeek(date);
  return new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
}

export function startOfLagosMonth(date: Date = new Date()): Date {
  const { y, m } = lagosParts(date);
  return atLagosMidnight(y, m, "01");
}

/** Format a Date as `YYYY-MM-DD` in Africa/Lagos (for <input type="date">). */
export function toLagosDateInput(date: Date | string | null | undefined): string {
  if (!date) return "";
  const value = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(value.getTime())) return "";
  const { y, m, d } = lagosParts(value);
  return `${y}-${m}-${d}`;
}

/** Format a Date as `YYYY-MM-DDTHH:mm` in Africa/Lagos (for datetime-local input). */
export function toLagosDateTimeInput(date: Date | string | null | undefined): string {
  if (!date) return "";
  const value = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(value.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: LAGOS_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(value);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}
