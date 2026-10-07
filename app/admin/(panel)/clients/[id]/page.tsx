import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { AlertTriangle, CalendarPlus } from "lucide-react";
import { ClientForm } from "@/components/ClientForm";
import { ClientTimeline } from "@/components/ClientTimeline";
import { ContactButtons } from "@/components/ContactButtons";
import { formatPrice } from "@/components/ServiceCard";
import { getClientById, getClientHistory } from "@/app/lib/clients";
import { getClientMaintenance } from "@/app/lib/maintenance";
import { MaintenanceRow } from "@/components/MaintenanceRow";
import { getSalonInfo } from "@/app/lib/settings";
import { formatDateTime } from "@/lib/time";
import type { ClientHistoryItem, ClientStats } from "@/app/lib/definitions";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
};

// params and searchParams are request-time data, so they are read inside Suspense.
export default function ClientPage({ params, searchParams }: Props) {
  return (
    <Suspense fallback={<p className="text-gray-500">Se încarcă…</p>}>
      <ClientFile params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function ClientFile({ params, searchParams }: Props) {
  const [{ id }, { saved }] = await Promise.all([params, searchParams]);
  const [client, history, maintenance] = await Promise.all([getClientById(id), getClientHistory(id), getClientMaintenance(id)]); // all check the admin role
  if (!client) notFound();

  await connection(); // splits upcoming/past by the current time, so render at request time
  const now = new Date();
  const next = history.items.filter((a) => a.status === "SCHEDULED" && new Date(a.start) > now).at(-1); // soonest
  const salon = (await getSalonInfo()).name;

  return (
    <div className="space-y-6">
      {saved && <p className="rounded-xl bg-primary-soft px-4 py-2 text-sm text-gray-800">Salvat.</p>}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl text-gray-900">{client.name}</h1>
          <p className="text-sm text-gray-500">{[client.phone, client.email].filter(Boolean).join(" · ")}</p>
        </div>
        <Link
          href={`/admin/appointments/new?clientId=${client.id}`}
          className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark"
        >
          <CalendarPlus className="h-4 w-4" /> Programează
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-[minmax(0,320px)_1fr]">
        {/* Left on tablets: who they are and how they've been doing. */}
        <aside className="space-y-4">
          <ContactButtons phone={client.phone} message={`Bună ziua, ${client.name.split(" ")[0]}! Vă scriem de la ${salon}.`} />

          {client.allergies && (
            <div className="flex gap-2 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <p>
                <span className="font-medium">Alergii: </span>
                {client.allergies}
              </p>
            </div>
          )}

          <Summary stats={history.stats} next={next} />

          {client.privateNotes && (
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="mb-1 text-xs font-semibold tracking-wide text-gray-500 uppercase">Note private</p>
              <p className="text-sm whitespace-pre-line text-gray-800">{client.privateNotes}</p>
            </div>
          )}
        </aside>

        <section className="space-y-6">
          {maintenance.length > 0 && (
            <div>
              <h2 className="mb-3 text-lg font-medium text-gray-900">Întreținere</h2>
              <ul className="space-y-2">
                {maintenance.map((m) => (
                  <MaintenanceRow key={m.id} m={m} back={`/admin/clients/${client.id}`} showClient={false} />
                ))}
              </ul>
            </div>
          )}
          <div>
            <h2 className="mb-3 text-lg font-medium text-gray-900">Istoric programări</h2>
            <ClientTimeline items={history.items} now={now} />
          </div>
        </section>
      </div>

      {/* Editing is secondary to reading the file, so it starts collapsed (open right after a save). */}
      <details open={Boolean(saved)} className="group rounded-2xl bg-white p-4 shadow-sm">
        <summary className="cursor-pointer text-sm font-medium text-primary">Editează datele clientului</summary>
        <div className="mt-4">
          <ClientForm client={client} />
        </div>
      </details>
    </div>
  );
}

function Summary({ stats, next }: { stats: ClientStats; next?: ClientHistoryItem }) {
  const tiles = [
    { label: "Vizite onorate", value: stats.honored },
    { label: "Întârzieri", value: stats.lateArrivals },
    { label: "Neonorate", value: stats.noShows, warn: stats.noShows > 0 },
    { label: "Anulate târziu", value: stats.cancelledLate, warn: stats.cancelledLate > 0 },
  ];
  return (
    <div className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
      <div className="grid grid-cols-2 gap-2">
        {tiles.map((t) => (
          <div key={t.label} className={`rounded-xl p-3 ${t.warn ? "bg-red-50" : "bg-gray-50"}`}>
            <p className={`text-2xl font-medium ${t.warn ? "text-red-700" : "text-gray-900"}`}>{t.value}</p>
            <p className="text-xs text-gray-500">{t.label}</p>
          </div>
        ))}
      </div>
      <dl className="space-y-1 text-sm">
        <Row label="Total cheltuit" value={Number(stats.totalSpent) > 0 ? formatPrice(stats.totalSpent) : "—"} />
        <Row label="Ultima vizită" value={stats.lastVisit ? formatDateTime(new Date(stats.lastVisit)) : "—"} />
        <Row label="Următoarea" value={next ? `${formatDateTime(new Date(next.start))} · ${next.serviceTitle}` : "—"} />
        {stats.cancelledInTime > 0 && <Row label="Anulate la timp" value={String(stats.cancelledInTime)} />}
      </dl>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-right text-gray-900">{value}</dd>
    </div>
  );
}
