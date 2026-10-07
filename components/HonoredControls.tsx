"use client";

import { useEffect, useRef, useState } from "react";
import { recordHonored } from "@/app/actions/appointments";
import { LATE_MINUTES, type MaintenanceOffer } from "@/app/lib/definitions";

type Props = {
  appointmentId: string;
  started: boolean;
  honoredOnTime: boolean; // already marked Onorată without delay
  lateMinutes: number | null; // current delay, if marked late
  offer: MaintenanceOffer | null; // null = this service has no maintenance
};

const pill =
  "rounded-full border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40";

// "Onorată" and "Întârziat (5/10/15/30)". When the service has a maintenance
// interval, both open the "Întreținere?" popup before saving.
export function HonoredControls({ appointmentId, started, honoredOnTime, lateMinutes, offer }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [dialogLate, setDialogLate] = useState<number | null | undefined>(undefined); // undefined = popup closed
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the delay menu on a click outside or Escape; Escape also closes the popup.
  useEffect(() => {
    const onClick = (e: MouseEvent) => menuRef.current && !menuRef.current.contains(e.target as Node) && setMenuOpen(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setMenuOpen(false);
      setDialogLate(undefined);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  // Without maintenance, each choice is a plain form; with it, the choice opens the popup.
  const choice = (late: number | null, label: string, className: string, disabled = false) =>
    offer ? (
      <button type="button" disabled={disabled} onClick={() => (setMenuOpen(false), setDialogLate(late))} className={className}>
        {label}
      </button>
    ) : (
      <form action={recordHonored.bind(null, appointmentId, late)}>
        <button disabled={disabled} className={className}>
          {label}
        </button>
      </form>
    );

  return (
    <>
      {choice(null, "Onorată", pill, !started || honoredOnTime)}

      <div ref={menuRef} className="relative">
        <button type="button" disabled={!started} aria-haspopup="true" aria-expanded={menuOpen} onClick={() => setMenuOpen((o) => !o)} className={pill}>
          Întârziat{lateMinutes ? ` (${lateMinutes} min)` : ""}
        </button>
        {menuOpen && (
          <div role="menu" className="absolute top-full left-0 z-20 mt-2 w-44 rounded-2xl bg-white p-2 shadow-lg ring-1 ring-black/5">
            <p className="px-2 pb-1 text-xs text-gray-500">Cu cât a întârziat?</p>
            <div className="grid grid-cols-2 gap-1">
              {LATE_MINUTES.map((m) => (
                <div key={m}>
                  {choice(m, `${m} min`, "w-full rounded-xl px-2 py-2 text-sm text-gray-800 hover:bg-primary-soft disabled:bg-primary disabled:text-white", m === lateMinutes)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {offer && dialogLate !== undefined && (
        <MaintenanceDialog appointmentId={appointmentId} late={dialogLate} offer={offer} onClose={() => setDialogLate(undefined)} />
      )}
    </>
  );
}

function MaintenanceDialog({ appointmentId, late, offer, onClose }: { appointmentId: string; late: number | null; offer: MaintenanceOffer; onClose: () => void }) {
  const [weeks, setWeeks] = useState(offer.defaultWeeks);
  const next = new Date(`${offer.visitDate}T12:00:00Z`);
  next.setUTCDate(next.getUTCDate() + Math.max(1, weeks) * 7);
  const nextLabel = new Intl.DateTimeFormat("ro-RO", { timeZone: "UTC", weekday: "short", day: "numeric", month: "long" }).format(next);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4" onClick={onClose}>
      <form
        action={recordHonored.bind(null, appointmentId, late)}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="maintenance-title"
        className="w-full max-w-sm space-y-4 rounded-3xl bg-white p-6 shadow-xl"
      >
        <div>
          <p className="text-xs font-semibold tracking-wide text-primary uppercase">
            {late ? `Onorată · întârziere ${late} min` : "Onorată"}
          </p>
          <h2 id="maintenance-title" className="mt-1 font-display text-xl text-gray-900">
            Întreținere pentru {offer.serviceTitle}?
          </h2>
        </div>

        {offer.clientDeclined ? (
          <>
            <p className="rounded-xl bg-gray-50 p-3 text-sm text-gray-700">
              Clientul a refuzat întreținerea din aplicație, așa că nu îi putem trimite SMS. Doar clientul o poate reactiva.
            </p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={onClose} className="rounded-full px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">
                Renunță
              </button>
              <button className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary-dark">Marchează Onorată</button>
            </div>
          </>
        ) : (
          <>
            <label className="flex items-center gap-3 text-sm text-gray-700">
              Interval
              <input
                name="weeks"
                type="number"
                min={1}
                max={52}
                value={weeks}
                onChange={(e) => setWeeks(Number(e.target.value))}
                className="w-20 rounded-xl px-3 py-2 text-center ring-1 ring-gray-200 outline-none focus:ring-2 focus:ring-primary"
              />
              săptămâni
            </label>
            <p className="rounded-xl bg-primary-soft/60 p-3 text-sm text-gray-800">
              Următoarea întreținere: <span className="font-medium">{nextLabel}</span>
              <br />
              <span className="text-xs text-gray-600">Clientul primește un SMS la 10:00 în acea zi, dacă nu are deja programare.</span>
            </p>
            {offer.currentlyActive && <p className="text-xs text-gray-500">Clientul are deja întreținere; „Da” o reînnoiește de la această vizită.</p>}
            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" onClick={onClose} className="rounded-full px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">
                Renunță
              </button>
              <button name="maintenance" value="no" className="rounded-full px-4 py-2 text-sm font-medium text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50">
                Nu
              </button>
              <button name="maintenance" value="yes" className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary-dark">
                Da, cu întreținere
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
