import { Suspense } from "react";
import Link from "next/link";
import { LogoutButton } from "@/components/LogoutButton";
import { SmsTools } from "@/components/SmsTools";
import { smsRedirectTarget } from "@/lib/sms";
import { AdminGuide } from "@/components/AdminGuide";
import { InstallPrompt } from "@/components/InstallPrompt";
import { AnnouncementForm } from "@/components/AnnouncementForm";
import { getAnnouncement, getSetupProgress, isAdminGuideHidden } from "@/app/lib/settings";
import { countPendingRequests } from "@/app/lib/requests";
import { setAdminGuideHidden } from "@/app/actions/settings";
import { StatusBadge } from "@/components/StatusBadge";
import { requireRole } from "@/app/lib/dal";
import { findUserById } from "@/app/lib/data";
import { getAgenda } from "@/app/lib/appointments";
import { formatTime, utcToSalon } from "@/lib/time";

// The session read (cookies) is request-time data, so it sits behind Suspense;
// the heading stays in the static shell.
export default function AdminPage() {
  return (
    <>
      <h1 className="mb-4 text-3xl font-medium text-gray-900">Panou</h1>
      <Suspense fallback={<p className="text-gray-500">Se încarcă…</p>}>
        <Dashboard />
      </Suspense>
    </>
  );
}

async function Dashboard() {
  // Read the user from the same session check as the rest of the page. Mixing in
  // getCurrentUser() ('use cache: private') makes Next.js prefetch this page with
  // cookies, and verifying the token outside that cache reads the clock while prerendering.
  const session = await requireRole("admin");
  const [user, { needsAttendance, upcoming }, guideHidden, progress, announcement, pendingRequests] = await Promise.all([
    findUserById(String(session.userId)),
    getAgenda(),
    isAdminGuideHidden(),
    getSetupProgress(),
    getAnnouncement(),
    countPendingRequests(),
  ]);
  const today = utcToSalon(new Date()).date;
  const todays = upcoming.filter((a) => utcToSalon(new Date(a.start)).date === today);

  return (
    <div className="space-y-6">
      <InstallPrompt />
      {!guideHidden && <AdminGuide progress={progress} />}

      {pendingRequests > 0 && (
        <Link href="/admin/requests" className="block rounded-2xl bg-primary-soft px-4 py-3 text-sm font-medium text-primary-dark shadow-sm hover:bg-primary hover:text-white">
          {pendingRequests === 1 ? "O cerere nouă de la un client" : `${pendingRequests} cereri noi de la clienți`} (anulare / reprogramare) →
        </Link>
      )}

      {needsAttendance.length > 0 && (
        <Link
          href="/admin/appointments"
          className="block rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800 shadow-sm hover:bg-amber-100"
        >
          {needsAttendance.length === 1 ? "O programare trecută așteaptă" : `${needsAttendance.length} programări trecute așteaptă`} marcarea prezenței →
        </Link>
      )}

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-wide text-gray-500 uppercase">Restul zilei de azi</h2>
          <Link href="/admin/appointments/new" className="text-sm text-primary hover:underline">
            Programează
          </Link>
        </div>
        {todays.length === 0 ? (
          <p className="text-sm text-gray-500">Nimic altceva programat azi.</p>
        ) : (
          <ul className="space-y-2">
            {todays.map((a) => (
              <li key={a.id}>
                <Link href={`/admin/appointments/${a.id}`} className="flex items-center justify-between gap-2 rounded-2xl bg-white p-3 shadow-sm hover:shadow-md">
                  <span className="text-sm text-gray-800">
                    <span className="font-medium">{formatTime(new Date(a.start))}</span> · {a.clientName} · {a.serviceTitle}
                  </span>
                  <StatusBadge status={a.status} lateMinutes={a.lateMinutes} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div id="sms" className="scroll-mt-24">
        <SmsTools redirectTo={smsRedirectTarget()} />
      </div>

      <section id="mesaj-clienti" className="scroll-mt-24 rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="font-medium text-gray-900">Mesaj pentru clienți</h2>
        <p className="mb-3 text-sm text-gray-500">Apare pe ecranul „Acasă” al fiecărui client.</p>
        <AnnouncementForm current={announcement} />
      </section>

      <div className="flex items-center justify-between border-t border-gray-200 pt-4">
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <span>Conectat ca {user?.name}</span>
          {guideHidden && (
            <form action={setAdminGuideHidden.bind(null, false)}>
              <button className="text-primary hover:underline">Arată ghidul</button>
            </form>
          )}
        </div>
        <LogoutButton redirectTo="/admin/login" />
      </div>
    </div>
  );
}
