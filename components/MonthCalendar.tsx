import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addMonths, daysOfMonth } from "@/lib/dates";

export type CalendarCell = {
  date: string; // "YYYY-MM-DD"
  href?: string; // clickable when set
  tone?: "available" | "muted" | "blocked" | "selected";
  label?: string; // short text under the day number (event title, "3 prog." …)
  title?: string; // tooltip / accessible description
};

const WEEK = ["L", "Ma", "Mi", "J", "V", "S", "D"]; // weeks start on Monday, as in Romania

const TONE: Record<NonNullable<CalendarCell["tone"]>, string> = {
  available: "bg-white text-gray-900 shadow-sm hover:ring-2 hover:ring-primary",
  muted: "text-gray-300",
  blocked: "bg-red-50 text-red-800",
  selected: "bg-primary text-white shadow-sm",
};

// A month grid with previous/next links. Server Component: navigation is plain
// links (?luna=YYYY-MM), so it works without JavaScript.
export function MonthCalendar({
  month,
  cells,
  monthHref,
  canGoBack = true,
  canGoForward = true,
}: {
  month: string;
  cells: Map<string, CalendarCell>;
  monthHref: (month: string) => string;
  canGoBack?: boolean;
  canGoForward?: boolean;
}) {
  const days = daysOfMonth(month);
  const lead = (new Date(`${days[0]}T12:00:00Z`).getUTCDay() + 6) % 7; // blanks before the 1st (Mon = 0)
  const title = new Intl.DateTimeFormat("ro-RO", { timeZone: "UTC", month: "long", year: "numeric" }).format(new Date(`${days[0]}T12:00:00Z`));
  const arrow = "grid h-9 w-9 place-items-center rounded-full text-gray-600 hover:bg-gray-100";

  return (
    <div className="rounded-2xl bg-white/60 p-3 shadow-sm ring-1 ring-black/5">
      <div className="mb-2 flex items-center justify-between">
        {canGoBack ? (
          <Link href={monthHref(addMonths(month, -1))} className={arrow} aria-label="Luna anterioară">
            <ChevronLeft className="h-5 w-5" />
          </Link>
        ) : (
          <span className="h-9 w-9" />
        )}
        <p className="font-medium text-gray-900 first-letter:uppercase">{title}</p>
        {canGoForward ? (
          <Link href={monthHref(addMonths(month, 1))} className={arrow} aria-label="Luna următoare">
            <ChevronRight className="h-5 w-5" />
          </Link>
        ) : (
          <span className="h-9 w-9" />
        )}
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500">
        {WEEK.map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
        {Array.from({ length: lead }, (_, i) => (
          <div key={`blank-${i}`} />
        ))}
        {days.map((date) => {
          const cell = cells.get(date) ?? { date, tone: "muted" as const };
          const body = (
            <>
              <span className="text-sm font-medium">{Number(date.slice(8))}</span>
              {cell.label && <span className="block truncate text-[10px] leading-tight">{cell.label}</span>}
            </>
          );
          const cls = `flex min-h-12 flex-col items-center justify-start rounded-xl px-0.5 py-1 ${TONE[cell.tone ?? "muted"]}`;
          return cell.href ? (
            <Link key={date} href={cell.href} className={cls} title={cell.title} aria-current={cell.tone === "selected" ? "date" : undefined}>
              {body}
            </Link>
          ) : (
            <div key={date} className={cls} title={cell.title} aria-disabled>
              {body}
            </div>
          );
        })}
      </div>
    </div>
  );
}
