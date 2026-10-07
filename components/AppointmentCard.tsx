import Image from "next/image";
import { Sparkles } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDateTime } from "@/lib/time";
import type { MyAppointmentView } from "@/app/lib/definitions";
import { RequestActions, type LatestRequest } from "@/components/RequestActions";

// `latest` is passed for upcoming appointments only; it enables the cancel/reschedule requests.
export function AppointmentCard({ appt, latest }: { appt: MyAppointmentView; latest?: LatestRequest }) {
  const upcoming = appt.status === "SCHEDULED" && new Date(appt.start) > new Date();
  return (
    <article className={`rounded-2xl p-4 shadow-sm ${upcoming ? "bg-blush" : "bg-primary-soft"}`}>
      <div className="flex items-center gap-3">
        {appt.serviceImageUrl ? (
          <Image src={appt.serviceImageUrl} alt={appt.serviceTitle} width={48} height={48} className="h-12 w-12 rounded-lg object-cover" />
        ) : (
          <div className="grid h-12 w-12 place-items-center rounded-lg bg-white/60 text-gray-600">
            <Sparkles className="h-5 w-5" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="font-medium text-gray-900">{appt.serviceTitle}</h3>
          {!upcoming && <StatusBadge status={appt.status} />}
        </div>
      </div>
      <p className="mt-3 border-t border-black/10 pt-3 text-sm text-gray-800">{formatDateTime(new Date(appt.start))}</p>
      {upcoming && latest !== undefined && <RequestActions appointmentId={appt.id} latest={latest} />}
    </article>
  );
}
