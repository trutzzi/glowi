"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, House, SlidersHorizontal, User } from "lucide-react";

const tabs = [
  { href: "/home", label: "Acasă", icon: House },
  { href: "/services", label: "Servicii", icon: SlidersHorizontal },
  { href: "/appointments", label: "Programări", icon: CalendarDays },
  { href: "/profile", label: "Profil", icon: User },
];

// usePathname() isn't known while prerendering pages with an id in the URL
// (/appointments/[id]/reschedule), so the highlighted bar renders inside Suspense;
// the fallback is the same bar with no tab highlighted.
export function BottomNav() {
  return (
    <Suspense fallback={<TabBar pathname={null} />}>
      <ActiveTabBar />
    </Suspense>
  );
}

function ActiveTabBar() {
  return <TabBar pathname={usePathname()} />;
}

function TabBar({ pathname }: { pathname: string | null }) {

  return (
    <nav className="sticky bottom-0 z-20 border-t border-gray-100 bg-white/95 pt-2 pb-[calc(1.25rem_+_env(safe-area-inset-bottom))] backdrop-blur md:pb-[calc(1rem_+_env(safe-area-inset-bottom))]">
      <div className="mx-auto grid max-w-xl grid-cols-4 md:gap-2">
      {tabs.map(({ href, label, icon: Icon }) => {
        const active = pathname?.startsWith(href) ?? false;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex flex-col items-center gap-1 text-[11px] font-medium md:flex-row md:justify-center md:gap-2 md:rounded-full md:py-1 md:text-sm ${active ? "text-primary" : "text-gray-500 hover:text-gray-800"}`}
          >
            <span className={`grid h-8 w-14 place-items-center rounded-full transition md:w-8 ${active ? "bg-primary-soft" : ""}`}>
              <Icon className="h-5 w-5" />
            </span>
            {label}
          </Link>
        );
      })}
      </div>
    </nav>
  );
}
