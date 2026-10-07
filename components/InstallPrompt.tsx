"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Download, Share, X } from "lucide-react";

// Chrome/Edge/Android fire this before offering installation; Safari never does.
type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

const DISMISS_KEY = "install-prompt-dismissed";

// What the browser tells us, read without an extra render ("server" during SSR).
type Env = "server" | "installed" | "dismissed" | "ios" | "other";
function readEnv(): Env {
  const standalone = window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as { standalone?: boolean }).standalone);
  if (standalone) return "installed";
  try {
    if (localStorage.getItem(DISMISS_KEY) === "1") return "dismissed";
  } catch {
    // storage blocked (private mode): treat as not dismissed
  }
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  return ios ? "ios" : "other";
}
const subscribeToNothing = () => () => {};

// "Install the app" card. Android/desktop Chrome get a button; iPhone/iPad get
// the Share → "Add to Home Screen" instructions. Hidden once installed or dismissed.
export function InstallPrompt({ className = "" }: { className?: string }) {
  const env = useSyncExternalStore(subscribeToNothing, readEnv, () => "server" as const);
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null);
  const [closed, setClosed] = useState(false);

  // Chromium announces installability asynchronously; listening is a subscription.
  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault(); // show our own button instead of the browser's mini-bar
      setInstallEvent(e as InstallEvent);
    };
    const onInstalled = () => setClosed(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const showIos = env === "ios";
  const showButton = env === "other" && installEvent !== null;
  if (closed || (!showIos && !showButton)) return null;

  const dismiss = () => {
    setClosed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore
    }
  };

  return (
    <aside className={`relative flex items-start gap-3 rounded-2xl bg-white p-4 pr-10 shadow-sm ring-1 ring-primary-soft ${className}`}>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
        <Download className="h-5 w-5" aria-hidden />
      </span>
      <div className="min-w-0 text-sm">
        <p className="font-medium text-gray-900">Instalează aplicația pe telefon</p>
        {showIos ? (
          <p className="text-gray-600">
            Apasă <Share className="inline h-4 w-4 align-text-bottom" aria-label="Partajează" /> în Safari, apoi „Adaugă pe ecranul principal”.
          </p>
        ) : (
          <>
            <p className="text-gray-600">O deschizi direct de pe ecranul principal, ca pe orice aplicație.</p>
            <button
              type="button"
              onClick={async () => {
                await installEvent!.prompt();
                if ((await installEvent!.userChoice).outcome === "accepted") setClosed(true);
              }}
              className="mt-2 rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-white hover:bg-primary-dark"
            >
              Instalează
            </button>
          </>
        )}
      </div>
      <button type="button" onClick={dismiss} aria-label="Închide" className="absolute top-2 right-2 rounded-full p-1.5 text-gray-400 hover:bg-gray-100">
        <X className="h-4 w-4" />
      </button>
    </aside>
  );
}
