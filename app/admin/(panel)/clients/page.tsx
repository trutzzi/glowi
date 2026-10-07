import { Suspense } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { getClients } from "@/app/lib/clients";
import { getClientIdsWithMaintenance } from "@/app/lib/maintenance";

type SearchParams = Promise<{ q?: string; filtru?: string }>;

// searchParams is request-time data, so it is read inside Suspense.
export default function AdminClientsPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-3xl font-medium text-gray-900">Clienți</h1>
        <Link
          href="/admin/clients/new"
          className="flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark"
        >
          <Plus className="h-4 w-4" /> Adaugă
        </Link>
      </div>
      <Suspense fallback={<p className="text-gray-500">Se încarcă clienții…</p>}>
        <ClientList searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function ClientList({ searchParams }: { searchParams: SearchParams }) {
  const { q = "", filtru } = await searchParams;
  const onlyMaintenance = filtru === "intretinere";
  const [all, withMaintenance] = await Promise.all([getClients(q), getClientIdsWithMaintenance()]); // both check the admin role
  const clients = onlyMaintenance ? all.filter((c) => withMaintenance.has(c.id)) : all;
  const tab = (active: boolean) =>
    `rounded-full px-4 py-1.5 text-sm font-medium ${active ? "bg-primary-soft text-primary-dark" : "text-gray-600 hover:bg-gray-100"}`;
  const link = (f?: string) => `/admin/clients?${new URLSearchParams({ ...(q && { q }), ...(f && { filtru: f }) })}`;

  return (
    <>
      {/* A plain GET form: the query lands in ?q= and the page re-renders on the server. */}
      <nav className="mb-3 flex gap-2" aria-label="Filtru clienți">
        <Link href={link()} className={tab(!onlyMaintenance)}>
          Toți
        </Link>
        <Link href={link("intretinere")} className={tab(onlyMaintenance)}>
          Cu întreținere · {withMaintenance.size}
        </Link>
      </nav>
      <form className="mb-4 flex items-center gap-2 rounded-full bg-gray-200/60 px-4 py-2.5 text-gray-500">
        {onlyMaintenance && <input type="hidden" name="filtru" value="intretinere" />}
        <Search className="h-4 w-4" />
        <input
          name="q"
          defaultValue={q}
          placeholder="Caută după nume, email sau telefon"
          className="w-full bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400"
        />
      </form>

      {clients.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-500">{q ? "Niciun client găsit." : onlyMaintenance ? "Niciun client cu întreținere activă." : "Niciun client încă."}</p>
      ) : (
        <ul className="grid gap-2 md:grid-cols-2">
          {clients.map((c) => (
            <li key={c.id}>
              <Link href={`/admin/clients/${c.id}`} className="block rounded-2xl bg-white p-4 shadow-sm transition hover:shadow-md">
                <p className="flex items-center gap-2 font-medium text-gray-900">
                  {c.name}
                  {withMaintenance.has(c.id) && (
                    <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs font-medium text-primary-dark">Întreținere</span>
                  )}
                </p>
                <p className="text-sm text-gray-500">
                  {[c.phone, c.email].filter(Boolean).join(" · ")}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
