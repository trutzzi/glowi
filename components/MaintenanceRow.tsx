import Link from "next/link";
import { MaintenanceBadge } from "@/components/MaintenanceBadge";
import { setMaintenanceActive, updateMaintenanceWeeks } from "@/app/actions/maintenance";
import { formatDateTime } from "@/lib/time";
import type { MaintenanceView } from "@/app/lib/definitions";

// "joi, 28 octombrie" from a "YYYY-MM-DD" salon day.
export const dayRo = (day: string) =>
  new Intl.DateTimeFormat("ro-RO", { timeZone: "UTC", weekday: "short", day: "numeric", month: "long" }).format(new Date(`${day}T12:00:00Z`));

// One maintenance entry with the admin's controls. `back` is the page to return to.
export function MaintenanceRow({ m, back, showClient = true }: { m: MaintenanceView; back: string; showClient?: boolean }) {
  const editable = m.state !== "declined";
  return (
    <li className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          {showClient ? (
            <Link href={`/admin/clients/${m.clientId}`} className="font-medium text-gray-900 hover:text-primary">
              {m.clientName}
            </Link>
          ) : (
            <p className="font-medium text-gray-900">{m.serviceTitle}</p>
          )}
          <p className="text-sm text-gray-500">
            {showClient && `${m.serviceTitle} · `}la {m.intervalWeeks} săpt. · următoarea {dayRo(m.dueDate)}
          </p>
          <p className="text-xs text-gray-400">
            Ultima vizită {formatDateTime(new Date(m.lastVisitAt))}
            {m.smsSentAt && ` · SMS trimis ${formatDateTime(new Date(m.smsSentAt))}`}
          </p>
        </div>
        <MaintenanceBadge state={m.state} />
      </div>

      {editable && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3 text-sm">
          <form action={updateMaintenanceWeeks.bind(null, m.id, back)} className="flex items-center gap-2">
            <input
              name="weeks"
              type="number"
              min={1}
              max={52}
              defaultValue={m.intervalWeeks}
              aria-label="Interval în săptămâni"
              className="w-16 rounded-lg px-2 py-1 text-center ring-1 ring-gray-200 outline-none focus:ring-2 focus:ring-primary"
            />
            <span className="text-gray-500">săpt.</span>
            <button className="rounded-full px-3 py-1 text-primary hover:bg-primary-soft">Schimbă</button>
          </form>
          <form action={setMaintenanceActive.bind(null, m.id, m.state === "stopped", back)}>
            <button className="rounded-full px-3 py-1 text-gray-600 hover:bg-gray-100">{m.state === "stopped" ? "Repornește" : "Oprește"}</button>
          </form>
          {m.state !== "stopped" && (
            <Link href={`/admin/appointments/new?clientId=${m.clientId}`} className="rounded-full px-3 py-1 text-gray-600 hover:bg-gray-100">
              Programează
            </Link>
          )}
        </div>
      )}
      {!editable && <p className="mt-2 text-xs text-gray-500">Clientul a oprit întreținerea din aplicație; doar el o poate reporni.</p>}
    </li>
  );
}
