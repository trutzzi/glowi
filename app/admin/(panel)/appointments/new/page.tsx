import { Suspense } from "react";
import { AppointmentForm } from "@/components/AppointmentForm";
import { getBookingOptions } from "@/app/lib/appointments";

type SearchParams = Promise<{ clientId?: string }>;

export default function NewAppointmentPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <>
      <h1 className="mb-4 text-3xl font-medium text-gray-900">Programare nouă</h1>
      <Suspense fallback={<p className="text-gray-500">Se încarcă…</p>}>
        <NewAppointmentForm searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function NewAppointmentForm({ searchParams }: { searchParams: SearchParams }) {
  const [{ clientId }, options] = await Promise.all([searchParams, getBookingOptions()]); // checks the admin role
  return <AppointmentForm {...options} initial={{ clientId }} />;
}
