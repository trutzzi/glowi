"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { createRequest, withdrawRequest, type RequestFormState } from "@/app/actions/requests";
import type { RequestStatusKey, RequestTypeKey } from "@/app/lib/definitions";

export type LatestRequest = { id: string; type: RequestTypeKey; status: RequestStatusKey; adminNote: string | null } | null;

const small = "rounded-full px-3 py-1.5 text-sm font-medium";

// Under an upcoming appointment: ask to move/cancel it, or follow the request.
export function RequestActions({ appointmentId, latest }: { appointmentId: string; latest: LatestRequest }) {
  const [asking, setAsking] = useState<RequestTypeKey | null>(null);
  const open = latest && (latest.status === "PENDING" || latest.status === "APPROVED");

  if (open && latest.status === "APPROVED" && latest.type === "RESCHEDULE") {
    return (
      <div className="mt-3 space-y-2 rounded-xl bg-white/70 p-3 text-sm">
        <p className="text-gray-800">Salonul a aprobat reprogramarea. Alege o nouă dată și oră.</p>
        <div className="flex flex-wrap gap-2">
          <Link href={`/appointments/${appointmentId}/reschedule`} className={`${small} bg-primary text-white hover:bg-primary-dark`}>
            Alege noua dată
          </Link>
          <form action={withdrawRequest.bind(null, latest.id)}>
            <button className={`${small} text-gray-600 hover:bg-white`}>Păstrez programarea</button>
          </form>
        </div>
      </div>
    );
  }

  if (open) {
    return (
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/70 p-3 text-sm">
        <p className="text-gray-800">
          Cerere de {latest.type === "CANCEL" ? "anulare" : "reprogramare"} trimisă. Așteaptă răspunsul salonului.
        </p>
        <form action={withdrawRequest.bind(null, latest.id)}>
          <button className={`${small} text-gray-600 hover:bg-white`}>Retrage cererea</button>
        </form>
      </div>
    );
  }

  return (
    <div className="mt-3">
      {latest?.status === "REJECTED" && (
        <p className="mb-2 rounded-xl bg-white/70 p-3 text-sm text-gray-700">
          Salonul nu a aprobat cererea anterioară{latest.adminNote ? `: „${latest.adminNote}”` : "."}
        </p>
      )}
      {asking ? (
        <RequestForm appointmentId={appointmentId} type={asking} onCancel={() => setAsking(null)} />
      ) : (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setAsking("RESCHEDULE")} className={`${small} bg-white text-primary-dark hover:bg-primary-soft`}>
            Cere reprogramare
          </button>
          <button type="button" onClick={() => setAsking("CANCEL")} className={`${small} text-gray-600 hover:bg-white`}>
            Cere anulare
          </button>
        </div>
      )}
    </div>
  );
}

function RequestForm({ appointmentId, type, onCancel }: { appointmentId: string; type: RequestTypeKey; onCancel: () => void }) {
  const [state, action, pending] = useActionState<RequestFormState, FormData>(createRequest.bind(null, appointmentId, type), {});
  return (
    <form action={action} className="space-y-2 rounded-xl bg-white/80 p-3">
      <p className="text-sm font-medium text-gray-900">{type === "CANCEL" ? "Cere anularea programării" : "Cere reprogramarea"}</p>
      <textarea
        name="message"
        rows={2}
        maxLength={300}
        placeholder={type === "CANCEL" ? "Motiv (opțional)" : "Ce zile ți se potrivesc? (opțional)"}
        className="w-full rounded-xl bg-white px-3 py-2 text-sm ring-1 ring-gray-200 outline-none focus:ring-2 focus:ring-primary"
      />
      {type === "RESCHEDULE" && <p className="text-xs text-gray-500">După ce salonul aprobă, îți alegi singur o oră liberă.</p>}
      {type === "CANCEL" && <p className="text-xs text-gray-500">Anulările cerute cu mai puțin de 24 de ore înainte apar ca „Anulată târziu”.</p>}
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <div className="flex gap-2">
        <button disabled={pending} className={`${small} bg-primary text-white hover:bg-primary-dark disabled:opacity-60`}>
          {pending ? "Se trimite…" : "Trimite cererea"}
        </button>
        <button type="button" onClick={onCancel} className={`${small} text-gray-600 hover:bg-gray-100`}>
          Renunță
        </button>
      </div>
    </form>
  );
}
