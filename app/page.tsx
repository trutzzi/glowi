import Image from "next/image";
import Link from "next/link";
import { BellRing, CalendarCheck, Sparkles } from "lucide-react";
import { Logo } from "@/components/Logo";
import { MobileShell } from "@/components/MobileShell";
import { InstallPrompt } from "@/components/InstallPrompt";
import { getSalonInfo } from "@/app/lib/settings";
import { getActiveServices } from "@/app/lib/services";

const FEATURES = [
  { icon: CalendarCheck, title: "Programările tale", text: "Vezi oricând următoarea vizită și tot istoricul." },
  { icon: BellRing, title: "Reminder prin SMS", text: "Primești un mesaj cu o zi înainte, ca să nu uiți." },
  { icon: Sparkles, title: "Servicii și prețuri", text: "Descoperă ce oferă salonul, cu durată și preț." },
];

// Welcome screen before login. Salon details and services are cached, so this
// page is prerendered and loads instantly.
export default async function WelcomePage() {
  const [salon, services] = await Promise.all([getSalonInfo(), getActiveServices()]);
  const showcase = services.filter((s) => s.imageUrl).slice(0, 4); // the salon's own photos, if any

  return (
    <MobileShell>
      <main className="flex flex-1 flex-col bg-gradient-to-b from-blush via-ivory to-ivory px-7 pt-12 pb-8">
        <header className="flex flex-col items-center text-center">
          <Logo className="h-16 w-16 text-primary" />
          <p className="mt-2 font-display text-2xl text-gray-900">{salon.name}</p>
        </header>

        <h1 className="mt-8 text-center text-[2rem] leading-tight text-gray-900">
          Frumusețea ta,
          <br />
          <span className="text-primary">programată simplu.</span>
        </h1>
        <p className="mx-auto mt-3 max-w-xs text-center text-sm text-gray-600">
          Aplicația clienților {salon.name}: programări, remindere și servicii, toate într-un singur loc.
        </p>

        {showcase.length >= 3 && (
          <ul className="mt-7 grid grid-cols-4 gap-2" aria-label="Câteva dintre serviciile noastre">
            {showcase.map((s) => (
              <li key={s.id} className="text-center">
                <Image src={s.imageUrl!} alt="" width={160} height={160} className="aspect-square w-full rounded-2xl object-cover shadow-sm" />
                <p className="mt-1 truncate text-[11px] text-gray-600">{s.title}</p>
              </li>
            ))}
          </ul>
        )}

        <ul className="mt-7 space-y-3">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex items-start gap-3 rounded-2xl bg-white/80 p-3 shadow-sm">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <span>
                <span className="block text-sm font-medium text-gray-900">{title}</span>
                <span className="block text-sm text-gray-600">{text}</span>
              </span>
            </li>
          ))}
        </ul>

        <InstallPrompt className="mt-6" />

        <div className="mt-auto pt-8">
          <Link
            href="/login"
            className="block rounded-full bg-primary py-4 text-center text-sm font-semibold tracking-widest text-white shadow-md transition hover:bg-primary-dark"
          >
            CONECTEAZĂ-TE
          </Link>
          <p className="mt-3 text-center text-xs text-gray-500">Folosește numărul de telefon și parola primită de la salon.</p>
        </div>
      </main>
    </MobileShell>
  );
}
