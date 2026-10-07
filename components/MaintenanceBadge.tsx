import type { MaintenanceState } from "@/app/lib/definitions";

export const MAINTENANCE_LABELS: Record<MaintenanceState, string> = {
  due: "Scadentă",
  upcoming: "Urmează",
  sent: "SMS trimis",
  booked: "Are programare",
  stopped: "Oprită",
  declined: "Refuzată de client",
};

const COLORS: Record<MaintenanceState, string> = {
  due: "bg-amber-100 text-amber-800",
  upcoming: "bg-primary-soft text-primary-dark",
  sent: "bg-blue-50 text-blue-800",
  booked: "bg-green-100 text-green-800",
  stopped: "bg-gray-200 text-gray-700",
  declined: "bg-red-100 text-red-800",
};

export function MaintenanceBadge({ state }: { state: MaintenanceState }) {
  return <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${COLORS[state]}`}>{MAINTENANCE_LABELS[state]}</span>;
}
