import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { AppointmentForm } from "@/components/AppointmentForm";
import { StatusBadge } from "@/components/StatusBadge";
import { HonoredControls } from "@/components/HonoredControls";
import { getMaintenanceOffer } from "@/app/lib/maintenance";
import { formatPrice } from "@/components/ServiceCard";
import { getAppointmentById, getBookingOptions } from "@/app/lib/appointments";
import { getSalonInfo } from "@/app/lib/settings";
import { setAppointmentStatus } from "@/app/actions/appointments";
import { formatDateTime, formatTime, utcToSalon } from "@/lib/time";
import { ContactButtons } from "@/components/ContactButtons";
import { STATUS_LABELS, type AppointmentStatus, type AppointmentView } from "@/app/lib/definitions";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string; with?: string }>;
};

const ERRORS: Record<string, string> = {
  "not-started": "„Onorată”, „Întârziat” și „Neonorată” se pot marca doar după ce programarea a început.",
  overlap: "Nu se poate redeschide: altă programare folosește acum acel interval.",
};

// Attendance choices, in the order the admin usually needs them.
// Onorată / Întârziat are handled by HonoredControls (they may ask about maintenance).
const OUTCOMES: AppointmentStatus[] = ["NOT_HONORED", "MISSED_SHORT_NOTICE", "MISSED_ANNOUNCED"];

export default function AppointmentPage({ params, searchParams }: Props) {
  return (
    <>
      <h1 className="mb-4 text-3xl font-medium text-gray-900">Programare</h1>
      <Suspense fallback={<p className="text-gray-500">Se încarcă…</p>}>
        <AppointmentDetails params={params} searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function AppointmentDetails({ params, searchParams }: Props) {
  const [{ id }, { saved, error, with: conflictId }] = await Promise.all([params, searchParams]);
  const [appt, options, offer] = await Promise.all([getAppointmentById(id), getBookingOptions(), getMaintenanceOffer(id)]); // all check the admin role
  if (!appt) notFound();

  await connection(); // compares with the current time, so render at request time
  const salonName = (await getSalonInfo()).name;
  const start = new Date(appt.start);
  const started = start <= new Date();
  const local = utcToSalon(start);

  return (
    <div className="space-y-6">
      {saved && <p className="rounded-xl bg-primary-soft px-4 py-2 text-sm text-gray-800">Salvat.</p>}
      {error && ERRORS[error] && (
        <p className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700">
          {ERRORS[error]}
          {conflictId && (
            <>
              {" "}
              <Link href={`/admin/appointments/${conflictId}`} className="font-medium underline">
                Vezi programarea suprapusă
              </Link>
            </>
          )}
        </p>
      )}

      <section className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <div>
            <Link href={`/admin/clients/${appt.clientId}`} className="font-medium text-primary hover:underline">
              {appt.clientName}
            </Link>
            <p className="text-sm text-gray-600">
              {appt.serviceTitle} · {formatDateTime(start)}–{formatTime(new Date(appt.end))}
            </p>
            <p className="text-sm text-gray-500">
              {formatPrice(appt.price)} · reminder {appt.reminderSentAt ? `trimis ${formatDateTime(new Date(appt.reminderSentAt))}` : "netrimis încă"}
            </p>
          </div>
          <StatusBadge status={appt.status} lateMinutes={appt.lateMinutes} />
        </div>

        <ContactButtons className="mt-3" phone={appt.clientPhone} message={whatsappMessage(appt, !started && appt.status === "SCHEDULED", salonName)} />

        <div className="mt-4 border-t border-gray-100 pt-3">
          <p className="mb-2 text-sm text-gray-600">Prezență</p>
          <div className="flex flex-wrap gap-2">
            <HonoredControls
              appointmentId={appt.id}
              started={started}
              honoredOnTime={appt.status === "HONORED" && !appt.lateMinutes}
              lateMinutes={appt.status === "HONORED" ? appt.lateMinutes : null}
              offer={offer}
            />
            {OUTCOMES.map((status) => {
              const disabled = appt.status === status || (!started && status === "NOT_HONORED");
              return (
                <form key={status} action={setAppointmentStatus.bind(null, appt.id, status)}>
                  <button
                    disabled={disabled}
                    className="rounded-full border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {STATUS_LABELS[status]}
                  </button>
                </form>
              );
            })}
            {appt.status !== "SCHEDULED" && (
              <form action={setAppointmentStatus.bind(null, appt.id, "SCHEDULED")}>
                <button className="rounded-full px-3 py-1.5 text-sm text-primary hover:bg-primary-soft">Anulează → Programată</button>
              </form>
            )}
          </div>
          {!started && <p className="mt-2 text-xs text-gray-500">„Onorată”, „Întârziat” și „Neonorată” devin disponibile când începe programarea.</p>}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-medium text-gray-900">Reprogramează sau editează</h2>
        <AppointmentForm
          {...options}
          currentServiceTitle={appt.serviceTitle}
          initial={{ id: appt.id, clientId: appt.clientId, serviceId: appt.serviceId, date: local.date, time: local.time, notes: appt.notes }}
        />
      </section>
    </div>
  );
}

function whatsappMessage(appt: AppointmentView, upcoming: boolean, salon: string) {
  const firstName = appt.clientName.split(" ")[0];
  const when = formatDateTime(new Date(appt.start));
  return upcoming
    ? `Bună ziua, ${firstName}! Vă scriem de la ${salon} pentru a vă reaminti programarea de ${when} – ${appt.serviceTitle}. Vă așteptăm cu drag!`
    : `Bună ziua, ${firstName}! Vă scriem de la ${salon} în legătură cu programarea de ${when} – ${appt.serviceTitle}.`;
}
