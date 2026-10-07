import { AdminNav } from "@/components/AdminNav";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";

// Full-width shell for every admin screen except /admin/login: a sticky top bar
// (logo + tabs) and a centred content column. It reads no session itself
// (layouts don't re-run on navigation); each page and data function checks the
// admin role on its own.
export default function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-ivory">
      <div className="sticky top-0 z-30 border-b border-gray-200 bg-white/90 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-col sm:flex-row sm:items-center sm:justify-between">
          <AppHeader href="/admin" subtitle="Admin" />
          <AdminNav />
        </div>
      </div>
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 pt-6 pb-12 sm:px-8">{children}</main>
      {/* Deliberately low-key: only the admin ever sees this layout. */}
      <footer className="mx-auto w-full max-w-5xl px-5 pb-[calc(1rem_+_env(safe-area-inset-bottom))] text-right sm:px-8">
        <Link href="/admin/logs" className="text-[10px] text-gray-300 hover:text-gray-500">
          logs
        </Link>
      </footer>
    </div>
  );
}
