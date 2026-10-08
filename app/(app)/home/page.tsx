import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { CalendarDays, Megaphone, Phone, Sparkles } from "lucide-react";
import { ServiceSearch } from "@/components/ServiceSearch";
import { verifySession } from "@/app/lib/dal";
import { findUserById } from "@/app/lib/data";
import { getActiveServices } from "@/app/lib/services";
import { getMyAppointments } from "@/app/lib/appointments";
import { getMyLatestRequests } from "@/app/lib/requests";
import { InstallPrompt } from "@/components/InstallPrompt";
import { getAnnouncement, getSalonInfo } from "@/app/lib/settings";
import { telLink } from "@/lib/phone";
import { isDemo } from "@/app/lib/demo";
import { SALON_TZ, formatDateTime } from "@/lib/time";

// Everything here depends on who is logged in, so it streams in behind Suspense;
// the fallback keeps the screen from jumping while it loads.
export default function HomePage() {
  return (
    <Suspense fallback={<p className="pt-6 text-gray-500">Se încarcă…</p>}>
      <HomeContent />
    </Suspense>
  );
}

async function HomeContent() {
  const session = await verifySession(); // redirects to /login when there is no valid session
  const [user, appointments, announcement, services, salon, requests] = await Promise.all([
    findUserById(String(session.userId)),
    getMyAppointments(),
    getAnnouncement(),
    getActiveServices(),
    getSalonInfo(),
    getMyLatestRequests(),
  ]);

  await connection(); // greeting and "next appointment" depend on the current time
  const now = new Date();
  const next = appointments.filter((a) => a.status === "SCHEDULED" && new Date(a.start) > now).at(-1); // list is newest first
  // A request doesn't change the appointment until the salon acts on it, but the client should see it is pending.
  const nextRequest = next ? requests.get(next.id) : undefined
  const openRequest = nextRequest && (nextRequest.status === "PENDING" || nextRequest.status === "APPROVED") ? nextRequest : null
  const today = new Intl.DateTimeFormat("ro-RO", { timeZone: SALON_TZ, weekday: "long", day: "numeric", month: "long" }).format(now);
  const firstName = user?.name.split(" ")[0] ?? "";
  const salonTel = salon.phone ? telLink(salon.phone) : null;
  const showAnnouncement = announcement.enabled && (announcement.title || announcement.body);

  return (
    <div className="space-y-6 pt-2">
      <header>
        <p className="text-sm text-gray-500 first-letter:uppercase">{today}</p>
        <h1 className="text-3xl text-gray-900">Bună, {firstName}!</h1>
      </header>

      {isDemo(session.userId) && (
        <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <span className="font-medium">Cont demo.</span> Programările și datele sunt exemple; poți explora tot, dar nimic nu se salvează.
        </p>
      )}

      <InstallPrompt />

      <div className="grid gap-4 md:grid-cols-2">
        {/* Next appointment, or an invitation to book one. */}
        <section className="rounded-3xl bg-blush p-5">
          <p className="flex items-center gap-2 text-xs font-semibold tracking-wide text-primary-dark uppercase">
            <CalendarDays className="h-4 w-4" aria-hidden /> Următoarea programare
          </p>
          {next ? (
            <>
              <p className="mt-2 font-display text-2xl text-gray-900">{next.serviceTitle}</p>
              <p className="mt-1 text-gray-700 first-letter:uppercase">{formatDateTime(new Date(next.start))}</p>
              {openRequest && (
                <p className="mt-3 rounded-xl bg-white/70 px-3 py-2 text-sm text-gray-800">
                  {openRequest.status === "APPROVED"
                    ? "Reprogramarea a fost aprobată: alege noua dată în Programările mele."
                    : `Ai cerut ${openRequest.type === "CANCEL" ? "anularea" : "reprogramarea"}. Până răspunde salonul, programarea rămâne valabilă.`}
                </p>
              )}
              <Link
                href={openRequest?.status === "APPROVED" ? `/appointments/${next.id}/reschedule` : "/appointments"}
                className="mt-3 inline-block text-sm font-medium text-primary-dark hover:underline"
              >
                {openRequest?.status === "APPROVED" ? "Alege noua dată →" : "Toate programările →"}
              </Link>
            </>
          ) : (
            <>
              <p className="mt-2 font-display text-xl text-gray-900">Nicio programare încă</p>
              <p className="mt-1 text-sm text-gray-700">
                Alege un serviciu mai jos și sună-ne. Te vom programa cu drag.
              </p>
            </>
          )}
        </section>

        {/* Message from the salon, written by the admin. */}
        {showAnnouncement ? (
          <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-primary-soft">
            <p className="flex items-center gap-2 text-xs font-semibold tracking-wide text-primary uppercase">
              <Megaphone className="h-4 w-4" aria-hidden /> De la salon
            </p>
            {announcement.title && <p className="mt-2 font-display text-xl text-gray-900">{announcement.title}</p>}
            {announcement.body && <p className="mt-1 text-sm whitespace-pre-line text-gray-700">{announcement.body}</p>}
          </section>
        ) : (
          <section className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="flex items-center gap-2 text-xs font-semibold tracking-wide text-primary uppercase">
              <Sparkles className="h-4 w-4" aria-hidden /> {salon.name}
            </p>
            <p className="mt-2 font-display text-xl text-gray-900">Strălucește și simte-te bine</p>
            <p className="mt-1 text-sm text-gray-700">Descoperă serviciile noastre și alege ce ți se potrivește.</p>
          </section>
        )}
      </div>

      <nav className="flex flex-wrap gap-2" aria-label="Acțiuni rapide">
        <Link href="/services" className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark">
          Vezi serviciile
        </Link>
        <Link href="/appointments" className="rounded-full bg-primary-soft px-4 py-2 text-sm font-medium text-primary-dark hover:bg-primary hover:text-white">
          Programările mele
        </Link>
        {salonTel && (
          <a href={salonTel} className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-50">
            <Phone className="h-4 w-4" aria-hidden /> Sună la salon
          </a>
        )}
      </nav>

      <section>
        <h2 className="mb-3 text-lg font-medium text-gray-900">Caută un serviciu</h2>
        <ServiceSearch services={services} />
      </section>
    </div>
  );
}
