import { Suspense } from "react";
import { connection } from "next/server";
import { Trash2 } from "lucide-react";
import { MonthCalendar, type CalendarCell } from "@/components/MonthCalendar";
import { EventForm } from "@/components/EventForm";
import { getAdminMonth, getUpcomingEvents } from "@/app/lib/calendar";
import { deleteEvent } from "@/app/actions/calendar";
import { formatDateTime, salonToUtc, utcToSalon } from "@/lib/time";
import { addDays, daysOfMonth, isMonth } from "@/lib/dates";
import type { CalendarEventView } from "@/app/lib/definitions";

type SearchParams = Promise<{ luna?: string }>;

export default function CalendarPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <>
      <h1 className="mb-1 text-3xl text-gray-900">Calendar</h1>
      <p className="mb-5 text-sm text-gray-500">Evenimentele blochează programările, atât pentru tine cât și pentru clienți.</p>
      <Suspense fallback={<p className="text-gray-500">Se încarcă…</p>}>
        <CalendarContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}

// "joi, 8 oct." for all-day events, full date-time for timed ones.
function eventWhen(e: CalendarEventView) {
  if (!e.allDay) return `${formatDateTime(new Date(e.start))} – ${utcToSalon(new Date(e.end)).time}`;
  const first = utcToSalon(new Date(e.start)).date;
  const last = addDays(utcToSalon(new Date(e.end)).date, -1);
  const fmt = (d: string) => new Intl.DateTimeFormat("ro-RO", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" }).format(new Date(`${d}T12:00:00Z`));
  return first === last ? `${fmt(first)}, toată ziua` : `${fmt(first)} – ${fmt(last)}, toată ziua`;
}

async function CalendarContent({ searchParams }: { searchParams: SearchParams }) {
  const { luna } = await searchParams;
  await connection(); // "today" and the default month depend on the current date
  const today = utcToSalon(new Date()).date;
  const month = isMonth(luna) ? luna : today.slice(0, 7);
  const [{ events, appointmentsPerDay }, upcoming] = await Promise.all([getAdminMonth(month), getUpcomingEvents()]); // both check the admin role

  // Day cells: events in red (title), otherwise the number of appointments.
  const cells = new Map<string, CalendarCell>();
  for (const date of daysOfMonth(month)) {
    const dayStart = salonToUtc(date, "00:00").getTime();
    const dayEnd = salonToUtc(addDays(date, 1), "00:00").getTime();
    const event = events.find((e) => new Date(e.start).getTime() < dayEnd && new Date(e.end).getTime() > dayStart);
    const count = appointmentsPerDay[date];
    cells.set(date, {
      date,
      href: `/admin/appointments?zi=${date}`,
      tone: event ? "blocked" : date === today ? "selected" : date < today ? "muted" : "available",
      label: event ? event.title : count ? `${count} prog.` : undefined,
      title: event ? `${event.title} — ${eventWhen(event)}` : undefined,
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-4">
        <MonthCalendar month={month} cells={cells} monthHref={(m) => `/admin/calendar?luna=${m}`} />

        <section>
          <h2 className="mb-2 text-sm font-semibold tracking-wide text-gray-500 uppercase">Evenimente viitoare</h2>
          {upcoming.length === 0 ? (
            <p className="text-sm text-gray-500">Niciun eveniment.</p>
          ) : (
            <ul className="space-y-2">
              {upcoming.map((e) => (
                <li key={e.id} className="flex items-start justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900">{e.title}</p>
                    <p className="text-sm text-gray-500 first-letter:uppercase">{eventWhen(e)}</p>
                    {e.notes && <p className="mt-1 text-sm text-gray-600">{e.notes}</p>}
                  </div>
                  <form action={deleteEvent.bind(null, e.id, `/admin/calendar?luna=${month}`)}>
                    <button aria-label={`Șterge ${e.title}`} className="rounded-full p-2 text-gray-400 hover:bg-red-50 hover:text-red-700">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="h-fit rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-medium text-gray-900">Eveniment nou</h2>
        <EventForm today={today} />
      </section>
    </div>
  );
}
