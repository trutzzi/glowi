"use client";

import { useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { THEME_EVENT, readThemeChoice, saveThemeChoice, type ThemeChoice } from "@/lib/theme";

const OPTIONS: { value: ThemeChoice; label: string; Icon: typeof Sun }[] = [
  { value: "auto", label: "Automat", Icon: Monitor },
  { value: "light", label: "Luminos", Icon: Sun },
  { value: "dark", label: "Întunecat", Icon: Moon },
];

// <html data-theme> changes when the visitor picks a theme or the system switches.
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributeFilter: ["data-theme"] });
  window.addEventListener(THEME_EVENT, onChange);
  return () => {
    observer.disconnect();
    window.removeEventListener(THEME_EVENT, onChange);
  };
}

// The theme currently shown ("light" on the server, before the script has run).
export function useIsDark() {
  return useSyncExternalStore(subscribe, () => document.documentElement.dataset.theme === "dark", () => false);
}

// Appearance for this device only; stored in the browser, not the account.
export function ThemeSwitch() {
  const choice = useSyncExternalStore(subscribe, readThemeChoice, () => "auto" as ThemeChoice);
  return (
    <div role="radiogroup" aria-label="Temă" className="grid grid-cols-3 gap-1 rounded-2xl bg-gray-100 p-1">
      {OPTIONS.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={choice === value}
          onClick={() => saveThemeChoice(value)}
          className="flex items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-sm text-gray-600 transition hover:text-gray-900 aria-checked:bg-surface aria-checked:font-medium aria-checked:text-primary-dark aria-checked:shadow-sm"
        >
          <Icon className="h-4 w-4" aria-hidden />
          {label}
        </button>
      ))}
    </div>
  );
}
