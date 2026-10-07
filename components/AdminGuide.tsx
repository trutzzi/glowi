import Link from "next/link";
import { Check, X } from "lucide-react";
import { setAdminGuideHidden } from "@/app/actions/settings";
import type { SetupProgress } from "@/app/lib/definitions";

type Step = { done: boolean; title: string; text: string; href: string; action: string };

// Quick tour of what the app does. Each step ticks itself off from real data.
export function AdminGuide({ progress }: { progress: SetupProgress }) {
  const steps: Step[] = [
    {
      done: progress.services > 0,
      title: "Servicii și categorii",
      text: "Adaugă serviciile salonului cu preț, durată, pauză de curățenie și imagine. Grupează-le în categorii.",
      href: "/admin/services",
      action: "Deschide Servicii",
    },
    {
      done: progress.clients > 0,
      title: "Clienți",
      text: "Creează clienți cu telefon (pentru SMS), alergii și note private. Le dai o parolă temporară pentru aplicație.",
      href: "/admin/clients/new",
      action: "Adaugă un client",
    },
    {
      done: progress.appointments > 0,
      title: "Programări",
      text: "Programează un client la un serviciu. Aplicația calculează ora de final și nu permite suprapuneri.",
      href: "/admin/appointments/new",
      action: "Programează",
    },
    {
      done: progress.attendanceRecorded > 0,
      title: "Prezență",
      text: "După vizită marchează Onorată, Întârziat, Neonorată sau Anulată. Totul apare în istoricul clientului.",
      href: "/admin/appointments",
      action: "Vezi programările",
    },
    {
      done: progress.smsLive,
      title: "Remindere SMS",
      text: "Clienții primesc SMS de confirmare la programare și un reminder la 10:00, cu o zi înainte. Setează SMSLINK_TEST=0 în .env și trimite un SMS de test mai jos.",
      href: "#sms",
      action: "Mergi la SMS",
    },
    {
      done: progress.announcement,
      title: "Mesaj pentru clienți",
      text: "Scrie un mesaj (oferte, program de sărbători) afișat pe ecranul principal al fiecărui client.",
      href: "#mesaj-clienti",
      action: "Scrie mesajul",
    },
  ];
  const done = steps.filter((s) => s.done).length;

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm" aria-labelledby="guide-title">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="guide-title" className="font-display text-xl text-gray-900">
            Ghid rapid
          </h2>
          <p className="text-sm text-gray-500">Ce poate face aplicația, pas cu pas. {done} din {steps.length} gata.</p>
        </div>
        <form action={setAdminGuideHidden.bind(null, true)}>
          <button aria-label="Ascunde ghidul" title="Ascunde ghidul" className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
            <X className="h-4 w-4" />
          </button>
        </form>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-100" aria-hidden>
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(done / steps.length) * 100}%` }} />
      </div>

      <ol className="mt-4 grid gap-3 md:grid-cols-2">
        {steps.map((s, i) => (
          <li key={s.title} className={`flex gap-3 rounded-xl p-3 ${s.done ? "bg-gray-50" : "bg-primary-soft/60"}`}>
            <span
              className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm font-medium ${s.done ? "bg-green-100 text-green-700" : "bg-white text-primary-dark"}`}
              aria-label={s.done ? "Gata" : `Pasul ${i + 1}`}
            >
              {s.done ? <Check className="h-4 w-4" /> : i + 1}
            </span>
            <div className="min-w-0">
              <p className={`font-medium ${s.done ? "text-gray-500" : "text-gray-900"}`}>{s.title}</p>
              <p className="text-sm text-gray-600">{s.text}</p>
              <Link href={s.href} className="mt-1 inline-block text-sm font-medium text-primary hover:underline">
                {s.action} →
              </Link>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
