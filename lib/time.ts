// Appointment times are entered and shown in the salon's time zone, and stored
// in UTC. Doing the conversion explicitly keeps bookings correct even when the
// server runs in another zone (most hosts use UTC).
export const SALON_TZ = "Europe/Bucharest";

// Minutes the salon's clock is ahead of UTC at a given instant (120 or 180).
function offsetMinutes(at: Date): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: SALON_TZ,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(at)
      .map((p) => [p.type, p.value])
  );
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return Math.round((asUtc - at.getTime()) / 60000);
}

// "2026-10-08" + "14:00" salon time -> the UTC instant.
export function salonToUtc(date: string, time: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const wallClock = Date.UTC(y, m - 1, d, hh, mm);
  let utc = wallClock - offsetMinutes(new Date(wallClock)) * 60000;
  // Re-check with the offset at the result, which differs around DST switches.
  utc = wallClock - offsetMinutes(new Date(utc)) * 60000;
  return new Date(utc);
}

// UTC instant -> { date: "2026-10-08", time: "14:00" } in salon time, for form inputs.
export function utcToSalon(at: Date): { date: string; time: string } {
  const f = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-CA", { timeZone: SALON_TZ, ...o }).format(at);
  return {
    date: f({ year: "numeric", month: "2-digit", day: "2-digit" }),
    time: f({ hour: "2-digit", minute: "2-digit", hourCycle: "h23" }),
  };
}

// "joi, 8 oct., 14:00"
export function formatDateTime(at: Date): string {
  return new Intl.DateTimeFormat("ro-RO", {
    timeZone: SALON_TZ,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(at);
}

// "14:00"
export function formatTime(at: Date): string {
  return utcToSalon(at).time;
}

// "joi, 8 octombrie" - used for day headings.
export function formatDay(at: Date): string {
  return new Intl.DateTimeFormat("ro-RO", { timeZone: SALON_TZ, weekday: "long", day: "numeric", month: "long" }).format(at);
}

// "octombrie 2026" - month headings in timelines.
export function formatMonth(at: Date): string {
  return new Intl.DateTimeFormat("ro-RO", { timeZone: SALON_TZ, month: "long", year: "numeric" }).format(at);
}
