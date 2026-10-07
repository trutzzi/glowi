"use client"; // Error boundaries must be Client Components

import "./globals.css";
import { ErrorScreen } from "@/components/ErrorScreen";

// Replaces the root layout when it fails, so it brings its own <html> and <body>.
export default function GlobalError(props: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="ro">
      <body className="flex min-h-dvh flex-col bg-ivory font-sans antialiased">
        <title>Eroare</title>
        <ErrorScreen {...props} />
      </body>
    </html>
  );
}
