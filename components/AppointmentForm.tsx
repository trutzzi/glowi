"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { saveAppointment } from "@/app/actions/appointments";
import { formatPrice } from "@/components/ServiceCard";
import type { AppointmentFormState, BookingOptions } from "@/app/lib/definitions";

type Initial = { id?: string; clientId?: string; serviceId?: string; date?: string; time?: string; notes?: string | null };
type Props = BookingOptions & { initial?: Initial; currentServiceTitle?: string };

const input =
  "w-full rounded-xl bg-white px-4 py-2.5 text-sm text-gray-800 shadow-sm outline-none focus:ring-2 focus:ring-primary";

export function AppointmentForm({ clients, services, initial = {}, currentServiceTitle }: Props) {
  const [state, formAction, pending] = useActionState<AppointmentFormState, FormData>(saveAppointment, {});
  const value = (name: keyof Initial) => state.values?.[name] ?? initial[name] ?? "";

  // Tracks the chosen service only to show its length and price under the dropdown.
  const [serviceId, setServiceId] = useState(value("serviceId"));
  const service = services.find((s) => s.id === serviceId);
  // An existing booking may use a service that has since been hidden.
  const keepsHiddenService = initial.serviceId && !services.some((s) => s.id === initial.serviceId);

  const error = (name: string) =>
    state.errors?.[name]?.length ? <p className="mt-1 text-xs text-red-600">{state.errors[name]![0]}</p> : null;

  return (
    <form action={formAction} className="max-w-2xl space-y-4">
      {initial.id && <input type="hidden" name="id" value={initial.id} />}

      <Field label="Client">
        <select name="clientId" required defaultValue={value("clientId")} className={input}>
          <option value="">Alege un client…</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.phone ? ` · ${c.phone}` : ""}
            </option>
          ))}
        </select>
        {error("clientId")}
      </Field>

      <Field label="Serviciu">
        <select name="serviceId" required value={serviceId} onChange={(e) => setServiceId(e.target.value)} className={input}>
          <option value="">Alege un serviciu…</option>
          {keepsHiddenService && <option value={initial.serviceId}>{currentServiceTitle} (ascuns)</option>}
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </select>
        {service && (
          <p className="mt-1 text-xs text-gray-500">
            {service.durationMin} min{service.bufferMin > 0 && ` + ${service.bufferMin} min pauză`} · {formatPrice(service.price)}
          </p>
        )}
        {error("serviceId")}
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Data">
          <input name="date" type="date" required defaultValue={value("date")} className={input} />
          {error("date")}
        </Field>
        <Field label="Ora de început">
          <input name="time" type="time" required step={300} defaultValue={value("time")} className={input} />
        </Field>
      </div>
      {error("time")}
      {state.conflictId && (
        <Link href={`/admin/appointments/${state.conflictId}`} className="-mt-2 inline-block text-xs font-medium text-primary hover:underline">
          Vezi programarea suprapusă →
        </Link>
      )}

      <Field label="Note (doar admin)">
        <textarea name="notes" rows={2} defaultValue={value("notes")} className={input} />
        {error("notes")}
      </Field>

      {state.message && <p role="alert" className="text-sm text-red-600">{state.message}</p>}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="flex-1 rounded-full bg-primary py-3 text-sm font-semibold tracking-widest text-white shadow-md transition hover:bg-primary-dark disabled:opacity-60"
        >
          {pending ? "SE SALVEAZĂ…" : initial.id ? "SALVEAZĂ" : "PROGRAMEAZĂ"}
        </button>
        <Link href="/admin/appointments" className="rounded-full px-5 py-3 text-sm text-gray-600 hover:bg-gray-100">
          Înapoi
        </Link>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-gray-600">{label}</span>
      {children}
    </label>
  );
}
