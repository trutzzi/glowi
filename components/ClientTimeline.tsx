import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";
import { formatPrice } from "@/components/ServiceCard";
import { formatDateTime, formatMonth, formatTime, utcToSalon } from "@/lib/time";
import type { AppointmentStatus, ClientHistoryItem } from "@/app/lib/definitions";

// Dot colour on the timeline line, by outcome.
const DOT: Record<AppointmentStatus, string> = {
  SCHEDULED: "bg-primary",
  HONORED: "bg-green-500",
  MISSED_ANNOUNCED: "bg-gray-300",
  MISSED_SHORT_NOTICE: "bg-amber-400",
  NOT_HONORED: "bg-red-500",
};

// A client's appointments: what's coming first, then the past grouped by month.
// `now` is passed in so the page decides it at request time.
export function ClientTimeline({ items, now }: { items: ClientHistoryItem[]; now: Date }) {
  if (items.length === 0) {
    return <p className="rounded-2xl bg-white p-6 text-center text-sm text-gray-500 shadow-sm">Nicio programare încă.</p>;
  }

  const upcoming = items.filter((a) => a.status === "SCHEDULED" && new Date(a.start) > now).reverse(); // soonest first
  const past = items.filter((a) => !upcoming.includes(a)); // already newest first

  const months = new Map<string, ClientHistoryItem[]>();
  for (const a of past) {
    const key = utcToSalon(new Date(a.start)).date.slice(0, 7); // "2026-10"
    months.set(key, [...(months.get(key) ?? []), a]);
  }

  return (
    <div className="space-y-6">
      {upcoming.length > 0 && <Section title="Urmează" items={upcoming} />}
      {[...months].map(([key, list]) => (
        <Section key={key} title={formatMonth(new Date(list[0].start))} items={list} />
      ))}
    </div>
  );
}

function Section({ title, items }: { title: string; items: ClientHistoryItem[] }) {
  return (
    <section>
      <h3 className="mb-2 text-sm font-semibold tracking-wide text-gray-500 uppercase">{title}</h3>
      <ol className="relative space-y-2 border-l-2 border-gray-200 pl-5">
        {items.map((a) => (
          <li key={a.id} className="relative">
            <span className={`absolute top-5 -left-[27px] h-3 w-3 rounded-full ring-4 ring-ivory ${DOT[a.status]}`} aria-hidden />
            <Link href={`/admin/appointments/${a.id}`} className="block rounded-2xl bg-white p-4 shadow-sm transition hover:shadow-md">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900">{a.serviceTitle}</p>
                  <p className="text-sm text-gray-500">
                    {formatDateTime(new Date(a.start))}–{formatTime(new Date(a.end))} · {formatPrice(a.price)}
                  </p>
                </div>
                <StatusBadge status={a.status} lateMinutes={a.lateMinutes} />
              </div>
              {a.notes && <p className="mt-2 rounded-xl bg-gray-50 px-3 py-2 text-sm text-gray-700">{a.notes}</p>}
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
