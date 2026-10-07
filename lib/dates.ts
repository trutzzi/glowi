// Calendar-day helpers on "YYYY-MM-DD" strings (salon days, no time zone involved).

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// A @db.Date column comes back as midnight UTC; this turns it into "YYYY-MM-DD".
export const dateOnly = (d: Date) => d.toISOString().slice(0, 10);

// "YYYY-MM-DD" -> Date for a @db.Date column.
export const toDbDate = (day: string) => new Date(`${day}T00:00:00Z`);

// "2026-10" -> "2026-11" (n months later; negative for earlier).
export function addMonths(month: string, n: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return d.toISOString().slice(0, 7);
}

// Every "YYYY-MM-DD" of a month.
export function daysOfMonth(month: string): string[] {
  const days: string[] = [];
  for (let d = `${month}-01`; d.startsWith(month); d = addDays(d, 1)) days.push(d);
  return days;
}

export const isMonth = (v: unknown): v is string => typeof v === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(v);
export const isDay = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
