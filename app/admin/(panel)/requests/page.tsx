import { Suspense } from "react";
import Link from "next/link";
import { approveRequest, rejectRequest } from "@/app/actions/requests";
import { getRequests } from "@/app/lib/requests";
import { formatDateTime } from "@/lib/time";
import type { RequestStatusKey, RequestView } from "@/app/lib/definitions";

const TYPE_LABEL = { CANCEL: "Anulare", RESCHEDULE: "Reprogramare" } as const;
const STATUS_LABEL: Record<RequestStatusKey, string> = {
  PENDING: "În așteptare",
  APPROVED: "Aprobată — clientul alege ora",
  REJECTED: "Respinsă",
  COMPLETED: "Finalizată",
  WITHDRAWN: "Retrasă de client",
};

export default function RequestsPage() {
  return (
    <>
      <h1 className="mb-1 text-3xl text-gray-900">Cereri</h1>
      <p className="mb-5 text-sm text-gray-500">Cereri de anulare sau reprogramare trimise de clienți din aplicație.</p>
      <Suspense fallback={<p className="text-gray-500">Se încarcă…</p>}>
        <Requests />
      </Suspense>
    </>
  );
}

async function Requests() {
  const { open, recent } = await getRequests(); // checks the admin role
  const pending = open.filter((r) => r.status === "PENDING");
  const waiting = open.filter((r) => r.status === "APPROVED");

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-2 text-sm font-semibold tracking-wide text-gray-500 uppercase">De răspuns · {pending.length}</h2>
        {pending.length === 0 ? (
          <p className="rounded-2xl bg-white p-6 text-center text-sm text-gray-500 shadow-sm">Nicio cerere nouă.</p>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {pending.map((r) => (
              <PendingCard key={r.id} r={r} />
            ))}
          </ul>
        )}
      </section>

      {waiting.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold tracking-wide text-gray-500 uppercase">Așteaptă ca clientul să aleagă ora · {waiting.length}</h2>
          <ul className="grid gap-2 md:grid-cols-2">
            {waiting.map((r) => (
              <HistoryRow key={r.id} r={r} />
            ))}
          </ul>
        </section>
      )}

      {recent.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold tracking-wide text-gray-500 uppercase">Recente</h2>
          <ul className="grid gap-2 md:grid-cols-2">
            {recent.map((r) => (
              <HistoryRow key={r.id} r={r} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Summary({ r }: { r: RequestView }) {
  return (
    <div className="min-w-0">
      <p className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${r.type === "CANCEL" ? "bg-red-50 text-red-800" : "bg-primary-soft text-primary-dark"}`}>
          {TYPE_LABEL[r.type]}
        </span>
        <Link href={`/admin/clients/${r.clientId}`} className="font-medium text-gray-900 hover:text-primary">
          {r.clientName}
        </Link>
      </p>
      <p className="mt-1 text-sm text-gray-600">
        <Link href={`/admin/appointments/${r.appointmentId}`} className="hover:underline">
          {r.serviceTitle} · {formatDateTime(new Date(r.appointmentStart))}
        </Link>
      </p>
      <p className="text-xs text-gray-400">Cerută {formatDateTime(new Date(r.createdAt))}</p>
    </div>
  );
}

function PendingCard({ r }: { r: RequestView }) {
  const late = r.type === "CANCEL" && new Date(r.appointmentStart).getTime() - new Date(r.createdAt).getTime() < 24 * 3600_000;
  return (
    <li className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
      <Summary r={r} />
      {r.message && <p className="rounded-xl bg-gray-50 px-3 py-2 text-sm text-gray-700">„{r.message}”</p>}
      {r.type === "CANCEL" && (
        <p className="text-xs text-gray-500">La aprobare devine „{late ? "Anulată târziu" : "Anulată la timp"}” (cerută cu {late ? "mai puțin" : "cel puțin"} de 24 h înainte).</p>
      )}
      {r.type === "RESCHEDULE" && <p className="text-xs text-gray-500">La aprobare, clientul primește SMS și își alege singur o oră liberă.</p>}
      <div className="flex flex-wrap items-end gap-2">
        <form action={approveRequest.bind(null, r.id)}>
          <button className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark">Aprobă</button>
        </form>
        <form action={rejectRequest.bind(null, r.id)} className="flex flex-1 items-center gap-2">
          <input name="adminNote" maxLength={300} placeholder="Motiv (opțional)" className="min-w-0 flex-1 rounded-full bg-white px-3 py-2 text-sm ring-1 ring-gray-200 outline-none focus:ring-2 focus:ring-primary" />
          <button className="rounded-full px-4 py-2 text-sm font-medium text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50">Respinge</button>
        </form>
      </div>
    </li>
  );
}

function HistoryRow({ r }: { r: RequestView }) {
  return (
    <li className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <Summary r={r} />
        <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">{STATUS_LABEL[r.status]}</span>
      </div>
      {r.adminNote && <p className="mt-2 text-xs text-gray-500">Motiv: {r.adminNote}</p>}
    </li>
  );
}
