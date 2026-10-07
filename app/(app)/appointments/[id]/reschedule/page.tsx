import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { MonthCalendar, type CalendarCell } from "@/components/MonthCalendar";
import { getMyApprovedReschedule } from "@/app/lib/requests";
import { CLIENT_HORIZON_DAYS, getDaySlots, getMonthAvailability } from "@/app/lib/availability";
import { pickRescheduleSlot } from "@/app/actions/requests";
import { formatDateTime, utcToSalon } from "@/lib/time";
import { addDays, isDay, isMonth } from "@/lib/dates";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ luna?: string; zi?: string; eroare?: string }>;
};

// The client picks a new time after the salon approved their reschedule request.
// params/searchParams are request-time data, so everything is read inside Suspense.
export default function ReschedulePage(props: Props) {
  return (
    <>
      <Link href="/appointments" className="text-sm text-primary hover:underline">
        ← Programările mele
      </Link>
      <h1 className="mt-2 mb-4 text-3xl text-gray-900">Alege o nouă dată</h1>
      <Suspense fallback={<p className="text-gray-500">Se încarcă…</p>}>
        <Picker {...props} />
      </Suspense>
    </>
  );
}

async function Picker({ params, searchParams }: Props) {
  const [{ id }, { luna, zi, eroare }] = await Promise.all([params, searchParams]);
  const request = await getMyApprovedReschedule(id); // only the logged-in client's own, approved request
  if (!request || request.appointment.status !== "SCHEDULED") redirect("/appointments");
  const appt = request.appointment;

  await connection(); // availability depends on the current time
  const today = utcToSalon(new Date()).date;
  const lastMonth = addDays(today, CLIENT_HORIZON_DAYS).slice(0, 7);
  const month = isMonth(luna) && luna >= today.slice(0, 7) && luna <= lastMonth ? luna : (isDay(zi) ? zi : today).slice(0, 7);
  const day = isDay(zi) && zi.startsWith(month) ? zi : null;

  const [days, daySlots] = await Promise.all([
    getMonthAvailability(month, appt.serviceId, appt.id),
    day ? getDaySlots(day, appt.serviceId, appt.id) : null,
  ]);

  const cells = new Map<string, CalendarCell>(
    days.map((d) => [
      d.date,
      d.state === "available"
        ? { date: d.date, href: `?luna=${month}&zi=${d.date}`, tone: d.date === day ? "selected" : "available" }
        : d.state === "event"
          ? { date: d.date, tone: "blocked", label: "Închis", title: d.eventTitle }
          : d.state === "full"
            ? { date: d.date, tone: "muted", label: "Plin" }
            : { date: d.date, tone: "muted" },
    ])
  );

  return (
    <div className="grid gap-6 pb-8 md:grid-cols-2">
      <div className="space-y-3">
        <p className="rounded-xl bg-white p-3 text-sm text-gray-700 shadow-sm">
          <span className="font-medium text-gray-900">{appt.service.title}</span> · acum {formatDateTime(appt.appointmentDate)}
        </p>
        <MonthCalendar
          month={month}
          cells={cells}
          monthHref={(m) => `?luna=${m}`}
          canGoBack={month > today.slice(0, 7)}
          canGoForward={month < lastMonth}
        />
        <p className="flex flex-wrap gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="h-3 w-3 rounded bg-white ring-1 ring-gray-200" /> liberă
          </span>
          <span className="flex items-center gap-1">
            <span className="h-3 w-3 rounded bg-red-50 ring-1 ring-red-100" /> salon închis
          </span>
          <span>gri: indisponibilă</span>
        </p>
      </div>

      <section>
        {eroare === "ocupat" && (
          <p className="mb-3 rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700">Ora aleasă tocmai a fost ocupată. Alege alta.</p>
        )}
        {!day ? (
          <p className="text-sm text-gray-500">Alege o zi din calendar.</p>
        ) : (
          <>
            <h2 className="mb-3 font-medium text-gray-900 first-letter:uppercase">
              {new Intl.DateTimeFormat("ro-RO", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" }).format(new Date(`${day}T12:00:00Z`))}
            </h2>
            {daySlots && daySlots.slots.length > 0 ? (
              <div className="grid grid-cols-4 gap-2">
                {daySlots.slots.map((s) =>
                  s.available ? (
                    <form key={s.time} action={pickRescheduleSlot.bind(null, request.id, day, s.time)}>
                      <button className="w-full rounded-xl bg-white py-2 text-sm font-medium text-gray-900 shadow-sm hover:bg-primary hover:text-white">
                        {s.time}
                      </button>
                    </form>
                  ) : (
                    <span key={s.time} className="rounded-xl bg-gray-100 py-2 text-center text-sm text-gray-400 line-through" title="Indisponibil">
                      {s.time}
                    </span>
                  )
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Nicio oră liberă în această zi.</p>
            )}
            <p className="mt-3 text-xs text-gray-500">Apasă pe o oră pentru a muta programarea. Primești confirmarea prin SMS.</p>
          </>
        )}
      </section>
    </div>
  );
}
