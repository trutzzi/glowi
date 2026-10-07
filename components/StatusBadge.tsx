import { STATUS_LABELS, type AppointmentStatus } from "@/app/lib/definitions";

const COLORS: Record<AppointmentStatus, string> = {
  SCHEDULED: "bg-primary-soft text-gray-800",
  HONORED: "bg-green-100 text-green-800",
  MISSED_ANNOUNCED: "bg-gray-200 text-gray-700",
  MISSED_SHORT_NOTICE: "bg-amber-100 text-amber-800",
  NOT_HONORED: "bg-red-100 text-red-800",
};

export function StatusBadge({ status, lateMinutes }: { status: AppointmentStatus; lateMinutes?: number | null }) {
  const late = status === "HONORED" && lateMinutes;
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${late ? "bg-amber-100 text-amber-800" : COLORS[status]}`}>
      {STATUS_LABELS[status]}
      {late ? ` · întârziere ${lateMinutes} min` : ""}
    </span>
  );
}
