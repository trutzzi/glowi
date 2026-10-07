"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createEvent } from "@/app/actions/calendar";
import type { EventFormState } from "@/app/lib/definitions";

const input = "w-full rounded-xl bg-white px-3 py-2 text-sm text-gray-800 shadow-sm ring-1 ring-gray-200 outline-none focus:ring-2 focus:ring-primary";

const when = (iso: string) =>
  new Intl.DateTimeFormat("ro-RO", { timeZone: "Europe/Bucharest", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

// New blocking event: whole day(s) or a time range on one day.
export function EventForm({ today }: { today: string }) {
  const [state, action, pending] = useActionState<EventFormState, FormData>(createEvent, {});
  const [allDay, setAllDay] = useState(true);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);
  const error = (name: string) => (state.errors?.[name]?.length ? <p className="mt-1 text-xs text-red-600">{state.errors[name]![0]}</p> : null);

  return (
    <form ref={ref} action={action} className="space-y-3">
      <label className="block">
        <span className="mb-1 block text-sm text-gray-600">Titlu</span>
        <input name="title" required maxLength={80} placeholder="ex. Nunta unei prietene" className={input} />
        {error("title")}
      </label>

      <fieldset className="flex gap-2 text-sm">
        <label className={`cursor-pointer rounded-full px-3 py-1.5 ${allDay ? "bg-primary-soft text-primary-dark" : "text-gray-600 ring-1 ring-gray-200"}`}>
          <input type="radio" name="allDay" value="on" checked={allDay} onChange={() => setAllDay(true)} className="sr-only" /> Toată ziua
        </label>
        <label className={`cursor-pointer rounded-full px-3 py-1.5 ${!allDay ? "bg-primary-soft text-primary-dark" : "text-gray-600 ring-1 ring-gray-200"}`}>
          <input type="radio" name="allDay" value="off" checked={!allDay} onChange={() => setAllDay(false)} className="sr-only" /> Interval orar
        </label>
      </fieldset>

      {allDay ? (
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-sm text-gray-600">De la</span>
            <input name="startDay" type="date" required min={today} className={input} />
            {error("startDay")}
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-gray-600">Până la (inclusiv)</span>
            <input name="endDay" type="date" required min={today} className={input} />
            {error("endDay")}
          </label>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          <label className="block">
            <span className="mb-1 block text-sm text-gray-600">Ziua</span>
            <input name="day" type="date" required min={today} className={input} />
            {error("day")}
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-gray-600">De la</span>
            <input name="from" type="time" required step={900} className={input} />
            {error("from")}
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-gray-600">Până la</span>
            <input name="to" type="time" required step={900} className={input} />
            {error("to")}
          </label>
        </div>
      )}

      <label className="block">
        <span className="mb-1 block text-sm text-gray-600">Note (opțional)</span>
        <input name="notes" maxLength={300} className={input} />
      </label>

      <button disabled={pending} className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-60">
        {pending ? "Se salvează…" : "Adaugă evenimentul"}
      </button>

      {state.ok && <p className="text-sm text-green-700">Evenimentul a fost adăugat. În acest interval nu se mai pot face programări.</p>}
      {state.conflicts && state.conflicts.length > 0 && (
        <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
          <p className="font-medium">Atenție: există deja programări în acest interval. Mută-le sau anulează-le:</p>
          <ul className="mt-1 list-disc pl-5">
            {state.conflicts.map((c) => (
              <li key={c.id}>
                <Link href={`/admin/appointments/${c.id}`} className="underline">
                  {c.clientName}, {when(c.start)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </form>
  );
}
