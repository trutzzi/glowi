"use client";

import { useEffect } from "react";

// Registers the service worker that shows the offline page (public/sw.js).
export function PwaSetup() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {
      // Not fatal: the app works without it, just without the offline page.
    });
  }, []);
  return null;
}
