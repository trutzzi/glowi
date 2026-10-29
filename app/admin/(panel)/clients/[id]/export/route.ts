import { db } from "@/lib/db";
import { requireRole } from "@/app/lib/dal";

// GDPR right of access / portability (art. 15, 20): everything the salon keeps
// about one client, as a JSON file the admin can hand over. Admin only.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireRole("admin");
  const { id } = await params;
  const user = await db.user.findFirst({
    where: { id, role: "CLIENT" },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      allergies: true,
      allergiesConsentAt: true,
      privateNotes: true,
      createdAt: true,
      appointments: {
        orderBy: { appointmentDate: "desc" },
        select: {
          appointmentDate: true,
          endsAt: true,
          service: { select: { title: true } },
          price: true,
          status: true,
          lateMinutes: true,
          notes: true,
          reminderSentAt: true,
          createdAt: true,
        },
      },
      appointmentRequests: {
        orderBy: { createdAt: "desc" },
        select: { type: true, status: true, message: true, adminNote: true, createdAt: true, decidedAt: true, completedAt: true },
      },
      maintenances: {
        select: { service: { select: { title: true } }, intervalWeeks: true, lastVisitAt: true, dueDate: true, active: true, clientDeclined: true, smsSentAt: true },
      },
    },
  });
  if (!user) return new Response("Not found", { status: 404 });

  const body = JSON.stringify({ exportedAt: new Date().toISOString(), client: user }, null, 2);
  const slug = user.name.normalize("NFD").replace(/[^\w]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "client";
  return new Response(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="date-${slug}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
