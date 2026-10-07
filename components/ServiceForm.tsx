"use client";

import { useActionState } from "react";
import Image from "next/image";
import Link from "next/link";
import { saveService } from "@/app/actions/services";
import type { CategoryView, ServiceFormState, ServiceView } from "@/app/lib/definitions";

type Props = { service?: ServiceView; categories: CategoryView[] };

const input =
  "w-full rounded-xl bg-white px-4 py-2.5 text-sm text-gray-800 shadow-sm outline-none focus:ring-2 focus:ring-primary";

export function ServiceForm({ service, categories }: Props) {
  const [state, formAction, pending] = useActionState<ServiceFormState, FormData>(saveService, {});

  // After an error, show what the admin typed; otherwise the saved service.
  const value = (name: keyof ServiceView | "newCategory") =>
    state.values?.[name] ?? (service && name in service ? String(service[name as keyof ServiceView] ?? "") : "");

  const error = (name: string) =>
    state.errors?.[name]?.[0] && <p className="mt-1 text-xs text-red-600">{state.errors[name]![0]}</p>;

  return (
    <form action={formAction} className="max-w-2xl space-y-4">
      {service && <input type="hidden" name="id" value={service.id} />}

      <Field label="Denumire">
        <input name="title" required defaultValue={value("title")} className={input} />
        {error("title")}
      </Field>

      <Field label="Descriere">
        <textarea name="description" required rows={2} defaultValue={value("description")} className={input} />
        {error("description")}
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Categorie">
          <select name="categoryId" defaultValue={value("categoryId")} className={input}>
            <option value="">Fără categorie</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="…sau categorie nouă">
          <input name="newCategory" placeholder="ex. Gene" defaultValue={value("newCategory")} className={input} />
          {error("newCategory")}
        </Field>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Field label="Preț (lei)">
          <input name="price" inputMode="decimal" required defaultValue={value("price") || "0"} className={input} />
          {error("price")}
        </Field>
        <Field label="Durată (min)">
          <input name="durationMin" type="number" min={5} step={5} required defaultValue={value("durationMin") || "60"} className={input} />
          {error("durationMin")}
        </Field>
        <Field label="Pauză (min)">
          <input name="bufferMin" type="number" min={0} step={5} required defaultValue={value("bufferMin") || "0"} className={input} />
          {error("bufferMin")}
        </Field>
      </div>

      <Field label="Întreținere: revine după … săptămâni (opțional)">
        <input name="maintenanceWeeks" inputMode="numeric" placeholder="ex. 3 — gol dacă nu are întreținere" defaultValue={value("maintenanceWeeks")} className={`${input} max-w-xs`} />
        <p className="mt-1 text-xs text-gray-500">La marcarea „Onorată” vei fi întrebat dacă clientul vrea întreținere; primește SMS la 10:00 când e timpul.</p>
        {error("maintenanceWeeks")}
      </Field>

      <Field label="Imagine (JPG, PNG sau WebP, max. 4 MB)">
        {service?.imageUrl && (
          <div className="mb-2 flex items-center gap-3">
            <Image src={service.imageUrl} alt="" width={64} height={64} className="h-16 w-16 rounded-xl object-cover" />
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input type="checkbox" name="removeImage" /> Șterge imaginea
            </label>
          </div>
        )}
        <input name="image" type="file" accept="image/jpeg,image/png,image/webp" className={`${input} file:mr-3 file:rounded-full file:border-0 file:bg-primary-soft file:px-3 file:py-1 file:text-sm`} />
        {service?.imageUrl && <p className="mt-1 text-xs text-gray-500">Alege un fișier doar dacă vrei să înlocuiești imaginea.</p>}
        {error("image")}
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
        <Link href="/admin/services" className="rounded-full px-5 py-3 text-sm text-gray-600 hover:bg-gray-100">
          Renunță
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
