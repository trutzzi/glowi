import 'server-only'
import { db } from '@/lib/db'
import { requireRole, verifySession } from '@/app/lib/dal'
import type { RequestStatusKey, RequestView } from '@/app/lib/definitions'

const include = {
  user: { select: { name: true, phone: true } },
  appointment: { select: { appointmentDate: true, service: { select: { title: true } } } },
} as const

type Row = Awaited<ReturnType<typeof db.appointmentRequest.findMany<{ include: typeof include }>>>[number]

const toView = (r: Row): RequestView => ({
  id: r.id,
  type: r.type,
  status: r.status,
  message: r.message,
  adminNote: r.adminNote,
  createdAt: r.createdAt.toISOString(),
  decidedAt: r.decidedAt?.toISOString() ?? null,
  appointmentId: r.appointmentId,
  appointmentStart: r.appointment.appointmentDate.toISOString(),
  serviceTitle: r.appointment.service.title,
  clientId: r.userId,
  clientName: r.user.name,
  clientPhone: r.user.phone,
})

// Admin: open requests first (oldest first), then the latest decisions.
export async function getRequests() {
  await requireRole('admin')
  const [open, recent] = await Promise.all([
    db.appointmentRequest.findMany({ where: { status: { in: ['PENDING', 'APPROVED'] } }, include, orderBy: { createdAt: 'asc' } }),
    db.appointmentRequest.findMany({
      where: { status: { in: ['REJECTED', 'COMPLETED', 'WITHDRAWN'] } },
      include,
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
  ])
  return { open: open.map(toView), recent: recent.map(toView) }
}

export async function countPendingRequests(): Promise<number> {
  await requireRole('admin')
  return db.appointmentRequest.count({ where: { status: 'PENDING' } })
}

// Client: the latest request for each of their appointments, keyed by appointment id.
export async function getMyLatestRequests(): Promise<Map<string, { id: string; type: RequestView['type']; status: RequestStatusKey; adminNote: string | null }>> {
  const session = await verifySession()
  const rows = await db.appointmentRequest.findMany({
    where: { userId: String(session.userId) },
    orderBy: { createdAt: 'desc' },
    select: { id: true, appointmentId: true, type: true, status: true, adminNote: true },
  })
  const latest = new Map<string, { id: string; type: RequestView['type']; status: RequestStatusKey; adminNote: string | null }>()
  for (const r of rows) if (!latest.has(r.appointmentId)) latest.set(r.appointmentId, r)
  return latest
}

// Client: the approved reschedule for one of their appointments, if any.
export async function getMyApprovedReschedule(appointmentId: string) {
  const session = await verifySession()
  return db.appointmentRequest.findFirst({
    where: { appointmentId, userId: String(session.userId), type: 'RESCHEDULE', status: 'APPROVED' },
    include: { appointment: { include: { service: { select: { id: true, title: true } } } } },
  })
}
