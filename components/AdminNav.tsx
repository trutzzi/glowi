"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/admin", label: "Panou" },
  { href: "/admin/appointments", label: "Programări" },
  { href: "/admin/requests", label: "Cereri" },
  { href: "/admin/calendar", label: "Calendar" },
  { href: "/admin/clients", label: "Clienți" },
  { href: "/admin/maintenance", label: "Întreținere" },
  { href: "/admin/services", label: "Servicii" },
  { href: "/admin/profile", label: "Profil" },
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

function NavBar({ activeHref }: { activeHref: string | null }) {
  return (
    <nav className="flex gap-1 overflow-x-auto px-5 pb-3 sm:pb-0">
      {links.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${href === activeHref ? "bg-primary-soft text-primary-dark" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"}`}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
