"use client";

import { useActionState } from "react";
import { saveAnnouncement } from "@/app/actions/settings";
import type { Announcement, AnnouncementFormState } from "@/app/lib/definitions";

const input =
  "w-full rounded-xl bg-white px-4 py-2.5 text-sm text-gray-800 shadow-sm ring-1 ring-gray-200 outline-none focus:ring-2 focus:ring-primary";

// Edits the message shown on every client's home screen.
export function AnnouncementForm({ current }: { current: Announcement }) {
  const [state, formAction, pending] = useActionState<AnnouncementFormState, FormData>(saveAnnouncement, {});
  const error = (name: string) =>
    state.errors?.[name]?.length ? <p className="mt-1 text-xs text-red-600">{state.errors[name]![0]}</p> : null;

  return (
    <form action={formAction} className="space-y-3">
      <label className="flex items-center gap-2 text-sm text-gray-800">
        <input type="checkbox" name="enabled" defaultChecked={current.enabled} /> Afișează mesajul clienților
      </label>
      <label className="block">
        <span className="mb-1 block text-sm text-gray-600">Titlu</span>
        <input name="title" maxLength={60} defaultValue={current.title} placeholder="ex. −20% la manichiură în octombrie" className={input} />
        {error("title")}
      </label>
      <label className="block">
        <span className="mb-1 block text-sm text-gray-600">Mesaj</span>
        <textarea name="body" rows={3} maxLength={400} defaultValue={current.body} placeholder="ex. Pe 1 noiembrie salonul este închis. Vă mulțumim!" className={input} />
        {error("body")}
      </label>
      <div className="flex items-center gap-3">
        <button
          disabled={pending}
          className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-60"
        >
          {pending ? "Se salvează…" : "Salvează mesajul"}
        </button>
        {state.ok && <p className="text-sm text-green-700">Salvat. Clienții îl văd pe ecranul principal.</p>}
      </div>
    </form>
  );
}
