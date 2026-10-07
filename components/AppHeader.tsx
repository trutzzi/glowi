import Link from "next/link";
import { Logo } from "@/components/Logo";
import { getSalonInfo } from "@/app/lib/settings";

// Logo bar at the top of the client and admin screens. The salon name is cached
// ('use cache'), so the bar is still part of the prerendered shell.
export async function AppHeader({ href, subtitle }: { href: string; subtitle?: string }) {
  const { name } = await getSalonInfo();
  return (
    <header className="flex h-14 shrink-0 items-center px-5">
      <Link href={href} className="flex items-center gap-2 text-primary" aria-label={`${name} – început`}>
        <Logo className="h-9 w-9" />
        <span className="font-display text-xl text-gray-900">{name}</span>
        {subtitle && <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs font-medium text-primary-dark">{subtitle}</span>}
      </Link>
    </header>
  );
}
