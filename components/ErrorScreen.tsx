"use client";

import { useEffect } from "react";
import Link from "next/link";
import { reportClientError } from "@/app/actions/logs";

// Friendly error screen shared by app/error.tsx and app/global-error.tsx.
// Errors from the server are already logged by instrumentation.ts (and arrive
// here with only a digest), so only browser-side errors are reported.
export function ErrorScreen({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    if (error.digest) return;
    reportClientError({ message: error.message, stack: error.stack, path: window.location.pathname }).catch(() => {});
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-8 py-16 text-center">
      <h1 className="text-2xl text-gray-900">Ceva nu a mers bine</h1>
      <p className="mt-2 max-w-sm text-sm text-gray-500">
        Am înregistrat problema. Încearcă din nou; dacă persistă, revino puțin mai târziu.
      </p>
      {error.digest && <p className="mt-2 text-xs text-gray-400">Cod: {error.digest}</p>}
      <div className="mt-6 flex gap-3">
        <button onClick={() => retry()} className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary-dark">
          Încearcă din nou
        </button>
        <Link href="/" className="rounded-full px-6 py-3 text-sm text-gray-600 hover:bg-gray-100">
          Înapoi la început
        </Link>
      </div>
    </div>
  );
}
