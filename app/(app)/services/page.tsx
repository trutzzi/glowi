import { Suspense } from "react";
import { ServiceCard } from "@/components/ServiceCard";
import { verifySession } from "@/app/lib/dal";
import { getActiveServices } from "@/app/lib/services";

// The session read (cookies) is request-time data, so it sits behind Suspense;
// the heading stays in the static shell.
export default function ServicesPage() {
  return (
    <>
      <h1 className="mb-4 text-3xl font-medium text-gray-900">Servicii</h1>
      <Suspense fallback={<p className="text-gray-500">Se încarcă serviciile…</p>}>
        <ServicesList />
      </Suspense>
    </>
  );
}

async function ServicesList() {
  await verifySession(); // redirects to /login when there is no valid session
  const services = await getActiveServices();

  return (
    <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      {services.map((s) => (
        <li key={s.id}>
          <ServiceCard service={s} />
        </li>
      ))}
    </ul>
  );
}
