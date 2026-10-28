"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { changePassword, updateAdminProfile, updateMyConsent } from "@/app/actions/profile";
import { saveBrand, saveOpeningHours, saveSalonInfo } from "@/app/actions/settings";
import { BODY_FONTS, BRAND_PRESETS, DEFAULT_BRAND, HEADING_FONTS, brandCssVars, brandPalette, type Brand, type BodyFont, type HeadingFont } from "@/lib/brand";
import { WEEKDAYS_RO, type MyProfile, type OpeningHours, type ProfileFormState, type SalonInfo } from "@/app/lib/definitions";

const input =
  "w-full rounded-xl bg-surface px-4 py-2.5 text-sm text-gray-800 shadow-sm ring-1 ring-gray-200 outline-none focus:ring-2 focus:ring-primary";
const submit =
  "rounded-full bg-primary px-5 py-2 text-sm font-medium text-on-primary hover:bg-primary-dark disabled:opacity-60";

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

// Profil → Aspect: accent colour and fonts, with a live preview of a client screen.
export function BrandForm({ brand }: { brand: Brand }) {
  const [state, action, pending] = useActionState<ProfileFormState, FormData>(saveBrand, {});
  const [color, setColor] = useState(brand.color);
  const [headingFont, setHeadingFont] = useState<HeadingFont>(brand.headingFont);
  const [bodyFont, setBodyFont] = useState<BodyFont>(brand.bodyFont);
  const current = { color, headingFont, bodyFont };
  const palette = brandPalette(color);
  const isDefault = color === DEFAULT_BRAND.color && headingFont === DEFAULT_BRAND.headingFont && bodyFont === DEFAULT_BRAND.bodyFont;

  return (
    <form action={action} className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-5">
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-gray-700">Culoarea salonului</legend>
          <div className="flex flex-wrap items-center gap-2">
            {BRAND_PRESETS.map((p) => (
              <button
                key={p.color}
                type="button"
                onClick={() => setColor(p.color)}
                title={p.label}
                aria-label={p.label}
                aria-pressed={color === p.color}
                className="h-9 w-9 rounded-full ring-offset-2 aria-pressed:ring-2 aria-pressed:ring-gray-800"
                style={{ backgroundColor: p.color }}
              />
            ))}
            <label className="ml-1 flex items-center gap-2 text-sm text-gray-600">
              <input type="color" name="color" value={color} onChange={(e) => setColor(e.target.value.toLowerCase())} className="h-9 w-12 cursor-pointer rounded-lg border-0 bg-transparent p-0" />
              Altă culoare
            </label>
          </div>
          {palette.adjusted && (
            <p className="mt-2 text-xs text-gray-500">Culoarea a fost închisă puțin ({palette.primary}) ca textul alb de pe butoane să rămână ușor de citit.</p>
          )}
          <FieldError state={state} name="color" />
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-gray-700">Font pentru titluri</legend>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(HEADING_FONTS) as HeadingFont[]).map((key) => (
              <label key={key} className="cursor-pointer rounded-xl px-3 py-2 ring-1 ring-gray-200 has-checked:bg-primary-soft has-checked:ring-2 has-checked:ring-primary">
                <input type="radio" name="headingFont" value={key} checked={headingFont === key} onChange={() => setHeadingFont(key)} className="sr-only" />
                <span className="block text-lg leading-tight text-gray-900" style={{ fontFamily: `var(--font-${key})` }}>{HEADING_FONTS[key].label}</span>
                <span className="text-xs text-gray-500">{HEADING_FONTS[key].note}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-gray-700">Font pentru text</legend>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(BODY_FONTS) as BodyFont[]).map((key) => (
              <label key={key} className="cursor-pointer rounded-xl px-3 py-2 ring-1 ring-gray-200 has-checked:bg-primary-soft has-checked:ring-2 has-checked:ring-primary">
                <input type="radio" name="bodyFont" value={key} checked={bodyFont === key} onChange={() => setBodyFont(key)} className="sr-only" />
                <span className="block text-sm text-gray-900" style={{ fontFamily: `var(--font-${key})` }}>{BODY_FONTS[key].label} · Programări ușor</span>
                <span className="text-xs text-gray-500">{BODY_FONTS[key].note}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-wrap items-center gap-3">
          <button disabled={pending} className={submit}>{pending ? "Se salvează…" : "Salvează aspectul"}</button>
          {!isDefault && (
            <button
              type="button"
              onClick={() => {
                setColor(DEFAULT_BRAND.color);
                setHeadingFont(DEFAULT_BRAND.headingFont);
                setBodyFont(DEFAULT_BRAND.bodyFont);
              }}
              className="text-sm text-gray-500 hover:text-gray-800"
            >
              Revino la aspectul implicit
            </button>
          )}
          <Feedback state={state} />
        </div>
      </div>

      {/* Live preview: the same variables the app uses, applied to a mini client screen. */}
      <div aria-hidden style={brandCssVars(current) as React.CSSProperties} className="rounded-3xl bg-ivory p-5 font-sans ring-1 ring-gray-200">
        <p className="text-xs text-gray-500">Previzualizare · ecranul clientului</p>
        <p className="mt-1 font-display text-3xl text-gray-900">Bună, Maria!</p>
        <div className="mt-4 rounded-3xl bg-blush p-4">
          <p className="text-xs font-semibold tracking-wide text-primary-dark uppercase">Următoarea programare</p>
          <p className="mt-1 font-display text-xl text-gray-900">Manichiură semipermanentă</p>
          <p className="text-sm text-gray-700">Joi, 30 octombrie, ora 14:00</p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-on-primary">Vezi serviciile</span>
          <span className="rounded-full bg-primary-soft px-4 py-2 text-sm font-medium text-primary-dark">Programările mele</span>
        </div>
        <div className="mt-4 h-16 rounded-2xl bg-hero" />
      </div>
    </form>
  );
}
