import { Suspense } from "react";
import { notFound } from "next/navigation";
import { LogoutButton } from "@/components/LogoutButton";
import { ThemeSwitch } from "@/components/ThemeSwitch";
import { AdminProfileForm, BrandForm, OpeningHoursForm, PasswordForm, SalonForm } from "@/components/ProfileForms";
import { getOpeningHours } from "@/app/lib/availability";
import { getBrand, getSalonInfo } from "@/app/lib/settings";
import { requireRole } from "@/app/lib/dal";
import { getMyProfile } from "@/app/lib/profile";

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
  const [profile, salon, hours, brand] = await Promise.all([getMyProfile(), getSalonInfo(), getOpeningHours(), getBrand()]);
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
