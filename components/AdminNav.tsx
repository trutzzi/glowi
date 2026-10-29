"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, CalendarRange, Inbox, LayoutDashboard, Menu, RefreshCw, Sparkles, User, Users, X } from "lucide-react";

const links = [
  { href: "/admin", label: "Panou", icon: LayoutDashboard },
  { href: "/admin/appointments", label: "Programări", icon: CalendarDays },
  { href: "/admin/requests", label: "Cereri", icon: Inbox },
  { href: "/admin/calendar", label: "Calendar", icon: CalendarRange },
  { href: "/admin/clients", label: "Clienți", icon: Users },
  { href: "/admin/maintenance", label: "Întreținere", icon: RefreshCw },
  { href: "/admin/services", label: "Servicii", icon: Sparkles },
  { href: "/admin/profile", label: "Profil", icon: User },
];

// usePathname() isn't known while prerendering pages with an id in the URL
// (e.g. /admin/clients/[id]), so the highlighted version renders inside Suspense.
// The fallback is the same bar with nothing highlighted, so nothing shifts.
export function AdminNav() {
  return (
    <Suspense fallback={<NavBar activeHref={null} />}>
      <ActiveNavBar />
    </Suspense>
  );
}

function ActiveNavBar() {
  const pathname = usePathname();
  const active = links.find(({ href }) => (href === "/admin" ? pathname === href : pathname.startsWith(href)));
  return <NavBar activeHref={active?.href ?? null} />;
}

// Tabs from `sm:` up; below that a menu button that drops the same links down
// under the sticky bar (positioned against it, so the panel spans its full width).
function NavBar({ activeHref }: { activeHref: string | null }) {
  const [open, setOpen] = useState(false);
  const activeLabel = links.find(({ href }) => href === activeHref)?.label;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <nav className="hidden gap-1 overflow-x-auto px-5 sm:flex">
        {links.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            aria-current={href === activeHref ? "page" : undefined}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${href === activeHref ? "bg-primary-soft text-primary-dark" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"}`}
          >
            {label}
          </Link>
        ))}
      </nav>

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="admin-mobile-menu"
        aria-label={open ? "Închide meniul" : "Deschide meniul"}
        className="mr-3 flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 sm:hidden"
      >
        {activeLabel && <span className="max-w-[8rem] truncate">{activeLabel}</span>}
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {open && (
        <>
          <div className="absolute inset-x-0 top-full h-dvh bg-gray-900/20 sm:hidden" onClick={() => setOpen(false)} aria-hidden />
          <nav id="admin-mobile-menu" className="absolute inset-x-0 top-full border-b border-gray-200 bg-surface px-3 py-2 shadow-lg sm:hidden">
            {links.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                aria-current={href === activeHref ? "page" : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-base font-medium transition ${href === activeHref ? "bg-primary-soft text-primary-dark" : "text-gray-700 hover:bg-gray-100"}`}
              >
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            ))}
          </nav>
        </>
      )}
    </>
  );
}
