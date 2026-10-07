import { Suspense } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getAllServices } from "@/app/lib/services";
import { setServiceActive } from "@/app/actions/services";
import { formatPrice } from "@/components/ServiceCard";
import type { ServiceView } from "@/app/lib/definitions";

export default function AdminServicesPage() {
  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-3xl font-medium text-gray-900">Servicii</h1>
        <div className="flex items-center gap-2">
          <Link href="/admin/services/categories" className="rounded-full px-3 py-2 text-sm text-primary hover:bg-primary-soft">
            Categorii
          </Link>
          <Link
          href="/admin/services/new"
          className="flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark"
        >
          <Plus className="h-4 w-4" /> Adaugă
          </Link>
        </div>
      </div>
      <Suspense fallback={<p className="text-gray-500">Se încarcă serviciile…</p>}>
        <ServiceList />
      </Suspense>
    </>
  );
}

async function ServiceList() {
  const services = await getAllServices(); // checks the admin role

  // Group by category, keeping the order the query returned.
  const groups = new Map<string, ServiceView[]>();
  for (const s of services) {
    const key = s.categoryName ?? "Fără categorie";
    groups.set(key, [...(groups.get(key) ?? []), s]);
  }

  if (services.length === 0) return <p className="text-gray-500">Niciun serviciu încă.</p>;

  return (
    <div className="space-y-6">
      {[...groups].map(([category, items]) => (
        <section key={category}>
          <h2 className="mb-2 text-sm font-semibold tracking-wide text-gray-500 uppercase">{category}</h2>
          <ul className="grid gap-2 md:grid-cols-2">
            {items.map((s) => (
              <li key={s.id} className={`rounded-2xl bg-white p-4 shadow-sm ${s.active ? "" : "opacity-60"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900">
                      {s.title}
                      {!s.active && <span className="ml-2 rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-600">Ascuns</span>}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatPrice(s.price)} · {s.durationMin} min
                      {s.bufferMin > 0 && ` + ${s.bufferMin} min pauză`}
                      {s.maintenanceWeeks && ` · întreținere la ${s.maintenanceWeeks} săpt.`}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2 text-sm">
                    <Link href={`/admin/services/${s.id}`} className="rounded-full px-3 py-1 text-primary hover:bg-primary-soft">
                      Editează
                    </Link>
                    <form action={setServiceActive.bind(null, s.id, !s.active)}>
                      <button className="rounded-full px-3 py-1 text-gray-600 hover:bg-gray-100">{s.active ? "Ascunde" : "Afișează"}</button>
                    </form>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
