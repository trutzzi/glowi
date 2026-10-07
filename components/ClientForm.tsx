"use client";

import { useActionState, useRef } from "react";
import Link from "next/link";
import { saveClient } from "@/app/actions/clients";
import type { ClientFormState, ClientView } from "@/app/lib/definitions";

const input =
  "w-full rounded-xl bg-white px-4 py-2.5 text-sm text-gray-800 shadow-sm outline-none focus:ring-2 focus:ring-primary";

// A readable temporary password with letters and digits, e.g. "glow-k7m2p9".
function generatePassword() {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return `glow-${Array.from(bytes, (b) => chars[b % chars.length]).join("")}${bytes[0] % 10}`;
}

export function ClientForm({ client }: { client?: ClientView }) {
  const [state, formAction, pending] = useActionState<ClientFormState, FormData>(saveClient, {});
  const passwordRef = useRef<HTMLInputElement>(null);

  // After an error, show what the admin typed; otherwise the saved client.
  const value = (name: keyof ClientView) =>
    state.values?.[name] ?? (client?.[name] == null ? "" : String(client[name]));
  const checked = (name: "smsMarketingConsent" | "emailMarketingConsent") =>
    state.values ? state.values[name] === "on" : Boolean(client?.[name]);

  const error = (name: string) =>
    state.errors?.[name]?.length ? (
      <p className="mt-1 text-xs text-red-600">{state.errors[name]!.join(" · ")}</p>
    ) : null;

  return (
    <form action={formAction} className="max-w-2xl space-y-4">
      {client && <input type="hidden" name="id" value={client.id} />}

      <Field label="Nume">
        <input name="name" required defaultValue={value("name")} className={input} />
        {error("name")}
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Email (opțional)">
          <input name="email" type="email" defaultValue={value("email")} className={input} />
          {error("email")}
        </Field>
        <Field label="Telefon (SMS și conectare)">
          <input name="phone" type="tel" required placeholder="+40 712 345 678" defaultValue={value("phone")} className={input} />
          {error("phone")}
        </Field>
      </div>

      <Field label="Data nașterii">
        <input name="birthday" type="date" defaultValue={value("birthday")} className={input} />
        {error("birthday")}
      </Field>

      <Field label="Alergii și sensibilități">
        <textarea name="allergies" rows={2} placeholder="ex. vopsea cu PPD, latex" defaultValue={value("allergies")} className={input} />
        {error("allergies")}
      </Field>

      <Field label="Note private (doar admin, nu sunt afișate clientului)">
        <textarea name="privateNotes" rows={3} placeholder='ex. formulă culoare "7.1 + 20 vol, 35 min"' defaultValue={value("privateNotes")} className={input} />
        {error("privateNotes")}
      </Field>

      <fieldset className="rounded-xl bg-white p-4 shadow-sm">
        <legend className="px-1 text-sm text-gray-600">Consimțământ marketing (GDPR, opțional)</legend>
        <label className="flex items-center gap-2 py-1 text-sm text-gray-800">
          <input type="checkbox" name="smsMarketingConsent" defaultChecked={checked("smsMarketingConsent")} /> Oferte prin SMS
        </label>
        <label className="flex items-center gap-2 py-1 text-sm text-gray-800">
          <input type="checkbox" name="emailMarketingConsent" defaultChecked={checked("emailMarketingConsent")} /> Oferte prin email
        </label>
        {client?.consentUpdatedAt && (
          <p className="mt-1 text-xs text-gray-500">Modificat ultima dată {new Date(client.consentUpdatedAt).toLocaleString("ro-RO")}</p>
        )}
      </fieldset>

      <Field label={client ? "Parolă nouă (lasă gol pentru a o păstra pe cea actuală)" : "Parolă temporară"}>
        <div className="flex gap-2">
          <input ref={passwordRef} name="password" type="text" autoComplete="off" required={!client} className={input} />
          <button
            type="button"
            onClick={() => passwordRef.current && (passwordRef.current.value = generatePassword())}
            className="shrink-0 rounded-xl bg-primary-soft px-3 text-sm text-gray-700 hover:bg-primary hover:text-white"
          >
            Generează
          </button>
        </div>
        <p className="mt-1 text-xs text-gray-500">Comunic-o clientului; se conectează la /login cu numărul de telefon și această parolă.</p>
        {error("password")}
      </Field>

      {state.message && <p role="alert" className="text-sm text-red-600">{state.message}</p>}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="flex-1 rounded-full bg-primary py-3 text-sm font-semibold tracking-widest text-white shadow-md transition hover:bg-primary-dark disabled:opacity-60"
        >
          {pending ? "SE SALVEAZĂ…" : "SALVEAZĂ"}
        </button>
        <Link href="/admin/clients" className="rounded-full px-5 py-3 text-sm text-gray-600 hover:bg-gray-100">
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
