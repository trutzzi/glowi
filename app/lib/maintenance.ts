import 'server-only'
import { connection } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, verifySession } from '@/app/lib/dal'
import { utcToSalon } from '@/lib/time'
import { dateOnly } from '@/lib/dates'
import { demoMaintenance, isDemo } from '@/app/lib/demo'
import type { MaintenanceOffer, MaintenanceState, MaintenanceView } from '@/app/lib/definitions'

const include = {
  user: { select: { name: true, phone: true } },
  service: { select: { title: true } },
} as const

type Row = Awaited<ReturnType<typeof db.maintenance.findMany<{ include: typeof include }>>>[number]

// Rows plus their state. "booked" needs to know about future appointments, so
// those are looked up once for all rows.
async function toViews(rows: Row[]): Promise<MaintenanceView[]> {
  await connection() // states depend on today's date
  const today = utcToSalon(new Date()).date
  const future = rows.length
    ? await db.appointment.findMany({
        where: {
          status: 'SCHEDULED',
          appointmentDate: { gt: new Date() },
          OR: rows.map((r) => ({ userId: r.userId, serviceId: r.serviceId })),
        },
        select: { userId: true, serviceId: true },
      })
    : []
  const booked = new Set(future.map((a) => `${a.userId}:${a.serviceId}`))

  return rows.map((m) => {
    const due = dateOnly(m.dueDate)
    const state: MaintenanceState = m.clientDeclined
      ? 'declined'
      : !m.active
        ? 'stopped'
        : booked.has(`${m.userId}:${m.serviceId}`)
          ? 'booked'
          : m.smsSentAt
            ? 'sent'
            : due <= today
              ? 'due'
              : 'upcoming'
    return {
      id: m.id,
      clientId: m.userId,
      clientName: m.user.name,
      clientPhone: m.user.phone,
      serviceId: m.serviceId,
      serviceTitle: m.service.title,
      intervalWeeks: m.intervalWeeks,
      lastVisitAt: m.lastVisitAt.toISOString(),
      dueDate: due,
      smsSentAt: m.smsSentAt?.toISOString() ?? null,
      state,
    }
  })
}

// Every maintenance in the salon, soonest due first. Admin only.
export async function getAllMaintenance(): Promise<MaintenanceView[]> {
  await requireRole('admin')
  return toViews(await db.maintenance.findMany({ include, orderBy: { dueDate: 'asc' } }))
}

// One client's maintenance. Admin only.
export async function getClientMaintenance(clientId: string): Promise<MaintenanceView[]> {
  await requireRole('admin')
  return toViews(await db.maintenance.findMany({ where: { userId: clientId }, include, orderBy: { dueDate: 'asc' } }))
}

// The logged-in client's own maintenance, except what the salon stopped.
export async function getMyMaintenance(): Promise<MaintenanceView[]> {
  const session = await verifySession()
  if (isDemo(session.userId)) return demoMaintenance()
  const rows = await db.maintenance.findMany({
    where: { userId: String(session.userId), OR: [{ active: true }, { clientDeclined: true }] },
    include,
    orderBy: { dueDate: 'asc' },
  })
  return toViews(rows)
}

// Client ids with maintenance switched on (for the "Cu întreținere" filter).
export async function getClientIdsWithMaintenance(): Promise<Set<string>> {
  await requireRole('admin')
  const rows = await db.maintenance.findMany({ where: { active: true, clientDeclined: false }, select: { userId: true }, distinct: ['userId'] })
  return new Set(rows.map((r) => r.userId))
}

// What the "Întreținere?" popup offers when this visit is marked Onorată;
// null when the service has no maintenance interval.
export async function getMaintenanceOffer(appointmentId: string): Promise<MaintenanceOffer | null> {
  await requireRole('admin')
  const appt = await db.appointment.findUnique({
    where: { id: appointmentId },
    include: { service: { select: { title: true, maintenanceWeeks: true } } },
  })
  if (!appt?.service.maintenanceWeeks) return null
  const existing = await db.maintenance.findUnique({ where: { userId_serviceId: { userId: appt.userId, serviceId: appt.serviceId } } })
  return {
    serviceTitle: appt.service.title,
    defaultWeeks: existing?.intervalWeeks ?? appt.service.maintenanceWeeks,
    currentlyActive: Boolean(existing?.active && !existing.clientDeclined),
    clientDeclined: Boolean(existing?.clientDeclined),
    visitDate: utcToSalon(appt.appointmentDate).date,
  }
}
