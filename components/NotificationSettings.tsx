"use client";

import { useState } from "react";
import { Bell, X } from "lucide-react";
import { Toggle } from "./Toggle";

const initial = { sms: true, email: true, maintenance: false };

export function NotificationSettings() {
  const [open, setOpen] = useState(true);
  const [prefs, setPrefs] = useState(initial);
  const set = (key: keyof typeof initial) => (v: boolean) => setPrefs((p) => ({ ...p, [key]: v }));

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Setări notificări"
        className="absolute top-2 right-5 rounded-full bg-white p-2 text-gray-700 shadow-sm"
      >
        <Bell className="h-5 w-5" />
      </button>

      {/* Bottom sheet, sits right above the nav bar */}
      <div
        className={`absolute inset-x-0 bottom-[68px] z-10 rounded-t-3xl bg-white px-5 pt-4 pb-3 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] md:inset-x-auto md:right-6 md:bottom-[84px] md:w-96 md:rounded-3xl md:shadow-xl md:ring-1 md:ring-black/5 transition-transform duration-300 ${
          open ? "translate-y-0" : "pointer-events-none translate-y-[120%]"
        }`}
      >
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900">Setări notificări</h2>
          <button onClick={() => setOpen(false)} aria-label="Închide" className="text-gray-500">
            <X className="h-5 w-5" />
          </button>
        </div>
        <Toggle label="SMS cu o zi înainte" checked={prefs.sms} onChange={set("sms")} />
        <Toggle label="Email" checked={prefs.email} onChange={set("email")} />
        <Toggle label="Alerte de întreținere" checked={prefs.maintenance} onChange={set("maintenance")} />
      </div>
    </>
  );
}
