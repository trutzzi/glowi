import { Suspense } from "react";
import { notFound } from "next/navigation";
import { LogoutButton } from "@/components/LogoutButton";
import Link from "next/link";
import { ThemeSwitch } from "@/components/ThemeSwitch";
import { AdminProfileForm, BrandForm, LegalForm, OpeningHoursForm, PasswordForm, SalonForm } from "@/components/ProfileForms";
import { getOpeningHours } from "@/app/lib/availability";
import { getBrand, getLegalInfo, getSalonInfo } from "@/app/lib/settings";
import { requireRole } from "@/app/lib/dal";
import { getMyProfile } from "@/app/lib/profile";
import { getSmsCredit } from "@/lib/sms";

export default function AdminProfilePage() {
  return (
    <>
      <h1 className="mb-6 text-3xl text-gray-900">Profil</h1>
      <Suspense fallback={<p className="text-gray-500">Se încarcă…</p>}>
        <AdminProfile />
      </Suspense>
    </>
  );
}

async function AdminProfile() {
  await requireRole("admin");
  const [profile, salon, hours, brand, legal] = await Promise.all([getMyProfile(), getSalonInfo(), getOpeningHours(), getBrand(), getLegalInfo()]);
  if (!profile) notFound();

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <section className="rounded-2xl bg-surface p-5 shadow-sm md:col-span-2">
        <h2 className="font-medium text-gray-900">Salonul</h2>
        <p className="mb-3 text-sm text-gray-500">Apare în bara de sus, pe ecranul de bun venit, în SMS-uri și în mesajele WhatsApp.</p>
        <div className="grid gap-6 lg:grid-cols-2">
          <SalonForm salon={salon} />
          <div>
            <h3 className="mb-2 text-sm font-medium text-gray-700">Program</h3>
            <OpeningHoursForm hours={hours} />
          </div>
        </div>
      </section>
      <section className="rounded-2xl bg-surface p-5 shadow-sm md:col-span-2">
        <h2 className="font-medium text-gray-900">Aspect</h2>
        <p className="mb-4 text-sm text-gray-500">Culoarea și fonturile salonului, în toată aplicația (clienți și administrare).</p>
        <BrandForm brand={brand} />
        <div className="mt-6 max-w-md border-t border-gray-100 pt-5">
          <h3 className="text-sm font-medium text-gray-700">Temă</h3>
          <p className="mb-3 text-sm text-gray-500">Fiecare persoană alege pe dispozitivul ei; „Automat” urmează setarea sistemului.</p>
          <ThemeSwitch />
        </div>
      </section>
      <section className="rounded-2xl bg-surface p-5 shadow-sm md:col-span-2">
        <h2 className="font-medium text-gray-900">Date legale (GDPR)</h2>
        <p className="mb-1 text-sm text-gray-500">
          Apar în{" "}
          <Link href="/confidentialitate" className="text-primary hover:underline">
            Nota de informare
          </Link>{" "}
          pe care o văd clienții.
        </p>
        <p className="mb-4 text-xs text-amber-800">Textul notei este un model. Verificați-l cu un jurist înainte de a vă baza pe el.</p>
        <LegalForm legal={legal} />
      </section>
      <section className="rounded-2xl bg-surface p-5 shadow-sm md:col-span-2">
        <h2 className="font-medium text-gray-900">SMS-uri rămase</h2>
        <p className="mb-3 text-sm text-gray-500">Creditul din contul SMSLink, folosit pentru confirmări și remindere.</p>
        <Suspense fallback={<p className="text-sm text-gray-500">Se verifică…</p>}>
          <SmsCreditInfo />
        </Suspense>
      </section>
      <section className="rounded-2xl bg-surface p-5 shadow-sm">
        <h2 className="mb-3 font-medium text-gray-900">Datele tale</h2>
        <AdminProfileForm profile={profile} />
      </section>
      <section className="rounded-2xl bg-surface p-5 shadow-sm">
        <h2 className="mb-3 font-medium text-gray-900">Schimbă parola</h2>
        <PasswordForm />
      </section>
      <div className="md:col-span-2">
        <LogoutButton redirectTo="/admin/login" />
      </div>
    </div>
  );
}

// Below this many SMS the card warns the admin to top up.
const LOW_CREDIT = 50;

// Asks SMSLink on every visit (in its own Suspense, so a slow answer doesn't hold up the page).
async function SmsCreditInfo() {
  await requireRole("admin");
  const result = await getSmsCredit();
  if (!result.ok) return <p className="text-sm text-amber-800">Nu am putut afla creditul. {result.error}</p>;

  const low = result.credit < LOW_CREDIT;
  return (
    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
      <p className={`text-3xl font-semibold ${low ? "text-amber-700" : "text-gray-900"}`}>{result.credit.toLocaleString("ro-RO")}</p>
      {low && <p className="text-sm text-amber-800">Creditul e pe terminate. Reîncarcă din contul SMSLink.</p>}
      <a href="https://www.smslink.ro" target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
        Deschide SMSLink
      </a>
    </div>
  );
}
