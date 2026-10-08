import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { AppointmentCard } from "@/components/AppointmentCard";
import { NotificationSettings } from "@/components/NotificationSettings";
import { verifySession } from "@/app/lib/dal";
import { getMyAppointments } from "@/app/lib/appointments";
import { getMyLatestRequests } from "@/app/lib/requests";
import { DEMO_READ_ONLY } from "@/app/lib/demo";

type SearchParams = Promise<{ cerere?: string; mutata?: string; demo?: string }>;

// The session read (cookies) is request-time data, so it must sit behind a
// Suspense boundary; the heading stays in the static shell.
export default function AppointmentsPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <>
      <h1 className="text-3xl font-medium text-gray-900">Programările mele</h1>
      <Suspense fallback={<p className="mt-5 text-gray-500">Se încarcă programările…</p>}>
        <AppointmentsContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function AppointmentsContent({ searchParams }: { searchParams: SearchParams }) {
  const session = await verifySession();
  if (session.role !== "client") redirect("/login");

  const [all, requests, { cerere, mutata, demo }] = await Promise.all([getMyAppointments(), getMyLatestRequests(), searchParams]); // only this client's
  await connection(); // splits past/upcoming by the current time, so render at request time
  const now = new Date();
  const upcoming = all.filter((a) => a.status === "SCHEDULED" && new Date(a.start) > now).reverse(); // soonest first
  const past = all.filter((a) => !upcoming.includes(a));

  return (
    <>
      {demo && <p className="mt-4 rounded-xl bg-amber-50 px-4 py-2 text-sm text-amber-900">{DEMO_READ_ONLY}</p>}
      {cerere && <p className="mt-4 rounded-xl bg-primary-soft px-4 py-2 text-sm text-gray-800">Cererea a fost trimisă. Primești un SMS când salonul răspunde.</p>}
      {mutata && <p className="mt-4 rounded-xl bg-green-50 px-4 py-2 text-sm text-green-800">Programarea a fost mutată. Ți-am trimis confirmarea prin SMS.</p>}
      <h2 className="mt-5 mb-3 text-lg font-medium">Programări viitoare</h2>
      <div className="grid gap-3 md:grid-cols-2">
        {upcoming.length ? upcoming.map((a) => <AppointmentCard key={a.id} appt={a} latest={requests.get(a.id) ?? null} />) : <p className="text-sm text-gray-500">Nicio programare încă.</p>}
      </div>

      <h2 className="mt-6 mb-3 text-lg font-medium">Vizite anterioare</h2>
      <div className="grid gap-3 pb-48 md:grid-cols-2 md:pb-64">
        {past.length ? past.map((a) => <AppointmentCard key={a.id} appt={a} />) : <p className="text-sm text-gray-500">Nicio vizită încă.</p>}
      </div>

      <NotificationSettings />
    </>
  );
}
