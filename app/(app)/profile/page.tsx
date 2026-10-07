import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AlertTriangle, User } from "lucide-react";
import { LogoutButton } from "@/components/LogoutButton";
import { ConsentForm, PasswordForm } from "@/components/ProfileForms";
import { getMyProfile } from "@/app/lib/profile";
import { getMyMaintenance } from "@/app/lib/maintenance";
import { setMyMaintenance } from "@/app/actions/maintenance";
import { SALON_TZ } from "@/lib/time";

export default function ProfilePage() {
  return (
    <>
      <h1 className="mb-6 text-3xl text-gray-900">Profil</h1>
      <Suspense fallback={<p className="text-gray-500">Se încarcă profilul…</p>}>
        <ProfileContent />
      </Suspense>
    </>
  );
}

async function ProfileContent() {
  const [profile, maintenance] = await Promise.all([getMyProfile(), getMyMaintenance()]); // both read the session
  if (!profile) redirect("/login");

  const dateRo = (iso: string, withYear = true) =>
    new Intl.DateTimeFormat("ro-RO", { timeZone: SALON_TZ, day: "numeric", month: "long", ...(withYear && { year: "numeric" }) }).format(
      new Date(iso)
    );

  return (
    <div className="grid gap-4 pb-8 md:grid-cols-2">
      <section className="rounded-2xl bg-white p-5 shadow-sm md:col-span-2">
        <div className="flex items-center gap-4">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-blush text-primary-dark">
            <User className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="font-display text-xl text-gray-900">{profile.name}</p>
            <p className="text-sm text-gray-500">
              Client din {dateRo(profile.memberSince)} · {profile.honoredVisits === 1 ? "o vizită" : `${profile.honoredVisits} vizite`}
            </p>
          </div>
        </div>
        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
          <Detail label="Telefon (pentru conectare)" value={profile.phone} />
          <Detail label="Email" value={profile.email} />
          <Detail label="Data nașterii" value={profile.birthday ? dateRo(`${profile.birthday}T12:00:00Z`, false) : null} />
        </dl>
        {profile.allergies && (
          <p className="mt-4 flex gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>
              <span className="font-medium">Alergii notate: </span>
              {profile.allergies}
            </span>
          </p>
        )}
        <p className="mt-3 text-xs text-gray-500">Datele s-au schimbat? Spune-ne la următoarea vizită sau sună la salon.</p>
      </section>

      {maintenance.length > 0 && (
        <section className="rounded-2xl bg-white p-5 shadow-sm md:col-span-2">
          <h2 className="font-medium text-gray-900">Întreținere</h2>
          <p className="mb-3 text-sm text-gray-500">Îți trimitem un SMS când e timpul să revii. Poți opri oricând.</p>
          <ul className="space-y-2">
            {maintenance.map((m) => {
              const off = m.state === "declined";
              return (
                <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-gray-50 p-3">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900">{m.serviceTitle}</p>
                    <p className="text-sm text-gray-500">
                      {off ? "Oprită — nu primești SMS" : `La fiecare ${m.intervalWeeks} săptămâni · următoarea ${dateRo(`${m.dueDate}T12:00:00Z`, false)}`}
                    </p>
                  </div>
                  <form action={setMyMaintenance.bind(null, m.id, off)}>
                    <button
                      className={`rounded-full px-4 py-2 text-sm font-medium ${off ? "bg-primary text-white hover:bg-primary-dark" : "text-gray-700 ring-1 ring-gray-200 hover:bg-white"}`}
                    >
                      {off ? "Pornește din nou" : "Oprește"}
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-medium text-gray-900">Schimbă parola</h2>
        <PasswordForm />
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-medium text-gray-900">Oferte și noutăți</h2>
        <ConsentForm profile={profile} />
      </section>

      <div className="md:col-span-2">
        <LogoutButton redirectTo="/login" />
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-xl bg-gray-50 p-3">
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="text-gray-900">{value || "—"}</dd>
    </div>
  );
}
