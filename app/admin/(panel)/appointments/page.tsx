import { Suspense } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getAgenda, getAppointmentsOnDay } from "@/app/lib/appointments";
import type { AppointmentStatus } from "@/app/lib/definitions";
import { isDay } from "@/lib/dates";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDateTime, formatDay, formatTime, utcToSalon } from "@/lib/time";
import type { AppointmentView } from "@/app/lib/definitions";

type SearchParams = Promise<{ zi?: string }>;

// What each status means; shown under the agenda so the labels are never ambiguous.
const LEGEND: [AppointmentStatus, string][] = [
  ["SCHEDULED", "Programarea urmează."],
  ["HONORED", "Clientul a venit. Dacă a întârziat, apare și „întârziere X min”."],
  ["MISSED_ANNOUNCED", "Anulată cu cel puțin 24 de ore înainte (de client sau de salon)."],
  ["MISSED_SHORT_NOTICE", "Anulată cu mai puțin de 24 de ore înainte."],
  ["NOT_HONORED", "Clientul nu a venit și nu a anunțat."],
];

export default function AdminAppointmentsPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-3xl font-medium text-gray-900">Programări</h1>
        <Link
          href="/admin/appointments/new"
          className="flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark"
        >
          <Plus className="h-4 w-4" /> Programează
        </Link>
      </div>
      <Suspense fallback={<p className="text-gray-500">Se încarcă programările…</p>}>
        <Agenda searchParams={searchParams} />
      </Suspense>

      <details className="mt-8 rounded-2xl bg-white p-4 shadow-sm">
        <summary className="cursor-pointer text-sm font-medium text-gray-700">Ce înseamnă statusurile?</summary>
        <dl className="mt-3 space-y-2">
          {LEGEND.map(([status, text]) => (
            <div key={status} className="flex items-start gap-3 text-sm">
              <dt className="w-40 shrink-0">
                <StatusBadge status={status} />
              </dt>
              <dd className="text-gray-600">{text}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs text-gray-500">
          Când clientul cere anularea din aplicație, statusul se alege automat după momentul cererii, nu după momentul aprobării.
        </p>
      </details>
    </>
  );
}

async function Agenda({ searchParams }: { searchParams: SearchParams }) {
  const { zi } = await searchParams;
  if (isDay(zi)) return <DayView day={zi} />;
  const { needsAttendance, upcoming } = await getAgenda(); // checks the admin role

  // Group upcoming appointments by salon-local day.
  const days = new Map<string, AppointmentView[]>();
  for (const a of upcoming) {
    const key = utcToSalon(new Date(a.start)).date;
    days.set(key, [...(days.get(key) ?? []), a]);
  }

  return (
    <div className="space-y-6">
      {needsAttendance.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold tracking-wide text-amber-700 uppercase">De marcat prezența</h2>
          <ul className="grid gap-2 md:grid-cols-2">
            {needsAttendance.map((a) => (
              <Row key={a.id} appt={a} when={formatDateTime(new Date(a.start))} />
            ))}
          </ul>
        </section>
      )}

      {days.size === 0 && needsAttendance.length === 0 && <p className="text-gray-500">Nicio programare viitoare.</p>}

      {[...days].map(([day, items]) => (
        <section key={day}>
          <h2 className="mb-2 text-sm font-semibold tracking-wide text-gray-500 uppercase">{formatDay(new Date(items[0].start))}</h2>
          <ul className="grid gap-2 md:grid-cols-2">
            {items.map((a) => (
              <Row key={a.id} appt={a} when={`${formatTime(new Date(a.start))}–${formatTime(new Date(a.end))}`} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function Row({ appt, when }: { appt: AppointmentView; when: string }) {
  return (
    <li>
      <Link href={`/admin/appointments/${appt.id}`} className="block rounded-2xl bg-white p-4 shadow-sm transition hover:shadow-md">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-medium text-gray-900">{appt.clientName}</p>
            <p className="text-sm text-gray-500">
              {when} · {appt.serviceTitle}
            </p>
          </div>
          <StatusBadge status={appt.status} lateMinutes={appt.lateMinutes} />
        </div>
      </Link>
    </li>
  );
}

// One day, every status (from the admin calendar).
async function DayView({ day }: { day: string }) {
  const items = await getAppointmentsOnDay(day); // checks the admin role
  const title = new Intl.DateTimeFormat("ro-RO", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" }).format(new Date(`${day}T12:00:00Z`));
  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-wide text-gray-500 uppercase">{title}</h2>
        <Link href="/admin/appointments" className="text-sm text-primary hover:underline">
          Toată agenda
        </Link>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-gray-500">Nicio programare în această zi.</p>
      ) : (
        <ul className="grid gap-2 md:grid-cols-2">
          {items.map((a) => (
            <Row key={a.id} appt={a} when={`${formatTime(new Date(a.start))}–${formatTime(new Date(a.end))}`} />
          ))}
        </ul>
      )}
    </section>
  );
}
