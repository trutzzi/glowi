"use client";

import { useActionState, useEffect, useRef } from "react";
import { changePassword, updateAdminProfile, updateMyConsent } from "@/app/actions/profile";
import { saveOpeningHours, saveSalonInfo } from "@/app/actions/settings";
import { WEEKDAYS_RO, type MyProfile, type OpeningHours, type ProfileFormState, type SalonInfo } from "@/app/lib/definitions";

const input =
  "w-full rounded-xl bg-white px-4 py-2.5 text-sm text-gray-800 shadow-sm ring-1 ring-gray-200 outline-none focus:ring-2 focus:ring-primary";
const submit =
  "rounded-full bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-60";

function Feedback({ state }: { state: ProfileFormState }) {
  if (!state.message) return null;
  return <p className={`text-sm ${state.ok ? "text-green-700" : "text-red-600"}`}>{state.message}</p>;
}

function FieldError({ state, name }: { state: ProfileFormState; name: string }) {
  const errors = state.errors?.[name];
  return errors?.length ? <p className="mt-1 text-xs text-red-600">{errors.join(" · ")}</p> : null;
}

export function PasswordForm() {
  const [state, action, pending] = useActionState<ProfileFormState, FormData>(changePassword, {});
  const ref = useRef<HTMLFormElement>(null);
  // Clear the fields once the password has changed.
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);

  return (
    <form ref={ref} action={action} className="space-y-3">
      <label className="block">
        <span className="mb-1 block text-sm text-gray-600">Parola actuală</span>
        <input name="currentPassword" type="password" required autoComplete="current-password" className={input} />
        <FieldError state={state} name="currentPassword" />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm text-gray-600">Parola nouă (minim 8 caractere, o literă și o cifră)</span>
        <input name="newPassword" type="password" required autoComplete="new-password" className={input} />
        <FieldError state={state} name="newPassword" />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm text-gray-600">Repetă parola nouă</span>
        <input name="confirmPassword" type="password" required autoComplete="new-password" className={input} />
        <FieldError state={state} name="confirmPassword" />
      </label>
      <div className="flex items-center gap-3">
        <button disabled={pending} className={submit}>
          {pending ? "Se salvează…" : "Schimbă parola"}
        </button>
        <Feedback state={state} />
      </div>
    </form>
  );
}

export function ConsentForm({ profile }: { profile: MyProfile }) {
  const [state, action, pending] = useActionState<ProfileFormState, FormData>(updateMyConsent, {});
  return (
    <form action={action} className="space-y-3">
      <label className="flex items-start gap-3 text-sm text-gray-800">
        <input type="checkbox" name="smsMarketingConsent" defaultChecked={profile.smsMarketingConsent} className="mt-0.5" />
        <span>Vreau să primesc oferte și noutăți prin SMS</span>
      </label>
      {profile.email && (
        <label className="flex items-start gap-3 text-sm text-gray-800">
          <input type="checkbox" name="emailMarketingConsent" defaultChecked={profile.emailMarketingConsent} className="mt-0.5" />
          <span>Vreau să primesc oferte și noutăți prin email</span>
        </label>
      )}
      <p className="text-xs text-gray-500">
        Reminderele pentru programări se trimit oricum; ele nu sunt mesaje de marketing.
      </p>
      <div className="flex items-center gap-3">
        <button disabled={pending} className={submit}>
          {pending ? "Se salvează…" : "Salvează preferințele"}
        </button>
        <Feedback state={state} />
      </div>
    </form>
  );
}

export function AdminProfileForm({ profile }: { profile: MyProfile }) {
  const [state, action, pending] = useActionState<ProfileFormState, FormData>(updateAdminProfile, {});
  return (
    <form action={action} className="space-y-3">
      <label className="block">
        <span className="mb-1 block text-sm text-gray-600">Nume</span>
        <input name="name" required defaultValue={profile.name} className={input} />
        <FieldError state={state} name="name" />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm text-gray-600">Email (folosit la conectare)</span>
        <input name="email" type="email" required defaultValue={profile.email ?? ""} className={input} />
        <FieldError state={state} name="email" />
      </label>
      <div className="flex items-center gap-3">
        <button disabled={pending} className={submit}>
          {pending ? "Se salvează…" : "Salvează"}
        </button>
        <Feedback state={state} />
      </div>
    </form>
  );
}

export function SalonForm({ salon }: { salon: SalonInfo }) {
  const [state, action, pending] = useActionState<ProfileFormState, FormData>(saveSalonInfo, {});
  return (
    <form action={action} className="space-y-3">
      <label className="block">
        <span className="mb-1 block text-sm text-gray-600">Numele salonului</span>
        <input name="name" required maxLength={40} defaultValue={salon.name} className={input} />
        <FieldError state={state} name="name" />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm text-gray-600">Telefonul salonului (pentru „Sună la salon” și SMS)</span>
        <input name="phone" type="tel" defaultValue={salon.phone ?? ""} placeholder="07xx xxx xxx" className={input} />
        <FieldError state={state} name="phone" />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button disabled={pending} className={submit}>
          {pending ? "Se salvează…" : "Salvează"}
        </button>
        <Feedback state={state} />
      </div>
    </form>
  );
}

// Monday first, as in Romania.
const WEEK_ORDER = ["1", "2", "3", "4", "5", "6", "0"] as const;

export function OpeningHoursForm({ hours }: { hours: OpeningHours }) {
  const [state, action, pending] = useActionState<ProfileFormState, FormData>(saveOpeningHours, {});
  return (
    <form action={action} className="space-y-2">
      {WEEK_ORDER.map((d) => {
        const day = hours[d];
        return (
          <fieldset key={d} className="flex flex-wrap items-center gap-2 text-sm">
            <legend className="sr-only">{WEEKDAYS_RO[Number(d)]}</legend>
            <span className="w-24 text-gray-700">{WEEKDAYS_RO[Number(d)]}</span>
            <input name={`open_${d}`} type="time" step={900} defaultValue={day?.open ?? "09:00"} aria-label={`${WEEKDAYS_RO[Number(d)]}, deschidere`} className="rounded-lg px-2 py-1 ring-1 ring-gray-200 outline-none focus:ring-2 focus:ring-primary" />
            <span className="text-gray-400">–</span>
            <input name={`close_${d}`} type="time" step={900} defaultValue={day?.close ?? "18:00"} aria-label={`${WEEKDAYS_RO[Number(d)]}, închidere`} className="rounded-lg px-2 py-1 ring-1 ring-gray-200 outline-none focus:ring-2 focus:ring-primary" />
            <label className="flex items-center gap-1 text-gray-600">
              <input type="checkbox" name={`closed_${d}`} defaultChecked={!day} /> Închis
            </label>
            <FieldError state={state} name={d} />
          </fieldset>
        );
      })}
      <p className="text-xs text-gray-500">Clienții își aleg ora doar în acest program. Tu poți programa și în afara lui.</p>
      <div className="flex flex-wrap items-center gap-3 pt-1">
        <button disabled={pending} className={submit}>
          {pending ? "Se salvează…" : "Salvează programul"}
        </button>
        <Feedback state={state} />
      </div>
    </form>
  );
}
