import 'server-only'
import { connection } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, verifySession } from '@/app/lib/dal'
import { salonToUtc } from '@/lib/time'
import { addDays } from '@/lib/dates'
import { demoAppointments, isDemo } from '@/app/lib/demo'
import type { AppointmentView, BookingOptions, MyAppointmentView } from '@/app/lib/definitions'

// Appointments are personal and change often, so they are never cached.

const include = {
  user: { select: { name: true, phone: true } },
  service: { select: { title: true, image: { select: { updatedAt: true } } } },
} as const

type Row = Awaited<ReturnType<typeof db.appointment.findMany<{ include: typeof include }>>>[number]

function toView(a: Row): AppointmentView {
  return {
    id: a.id,
    clientId: a.userId,
    clientName: a.user.name,
    clientPhone: a.user.phone,
    serviceId: a.serviceId,
    serviceTitle: a.service.title,
    serviceImageUrl: a.service.image ? `/service-images/${a.serviceId}/${a.service.image.updatedAt.getTime()}` : null,
    start: a.appointmentDate.toISOString(),
    end: a.endsAt.toISOString(),
    price: a.price.toFixed(2),
    status: a.status,
    lateMinutes: a.lateMinutes,
    notes: a.notes,
    reminderSentAt: a.reminderSentAt?.toISOString() ?? null,
  }
}

// Admin agenda: everything that still needs attention plus what's coming up.
export async function getAgenda() {
  await requireRole('admin')
  await connection() // "now" must be read at request time, never prerendered
  const now = new Date()
  const [needsAttendance, upcoming] = await Promise.all([
    // Started already but nobody recorded what happened.
    db.appointment.findMany({
      where: { status: 'SCHEDULED', appointmentDate: { lt: now } },
      include,
      orderBy: { appointmentDate: 'asc' },
    }),
    db.appointment.findMany({
      where: { appointmentDate: { gte: now } },
      include,
      orderBy: { appointmentDate: 'asc' },
      take: 200,
    }),
  ])
  return { needsAttendance: needsAttendance.map(toView), upcoming: upcoming.map(toView) }
}

export async function getAppointmentById(id: string): Promise<AppointmentView | null> {
  await requireRole('admin')
  const row = await db.appointment.findUnique({ where: { id }, include })
  return row ? toView(row) : null
}

export async function getBookingOptions(): Promise<BookingOptions> {
  await requireRole('admin')
  const [clients, services] = await Promise.all([
    db.user.findMany({ where: { role: 'CLIENT' }, select: { id: true, name: true, phone: true }, orderBy: { name: 'asc' } }),
    db.service.findMany({
      where: { active: true },
      select: { id: true, title: true, durationMin: true, bufferMin: true, price: true },
      orderBy: { title: 'asc' },
    }),
  ])
  return { clients, services: services.map((s) => ({ ...s, price: s.price.toFixed(2) })) }
}

// The logged-in client's own appointments. The user id comes from the session,
// never from the caller, so one client can't ask for another's.
export async function getMyAppointments(): Promise<MyAppointmentView[]> {
  const session = await verifySession()
  if (isDemo(session.userId)) return demoAppointments()
  const rows = await db.appointment.findMany({
    where: { userId: String(session.userId) },
    include,
    orderBy: { appointmentDate: 'desc' },
  })
  // Listed field by field so admin-only fields (notes) can't slip through.
  return rows.map((row) => {
    const a = toView(row)
    return {
      id: a.id,
      clientId: a.clientId,
      clientName: a.clientName,
      serviceId: a.serviceId,
      serviceTitle: a.serviceTitle,
      serviceImageUrl: a.serviceImageUrl,
      start: a.start,
      end: a.end,
      price: a.price,
      status: a.status,
    }
  })
}

// Every appointment on one salon day, any status (admin calendar → day view).
export async function getAppointmentsOnDay(day: string): Promise<AppointmentView[]> {
  await requireRole('admin')
  const rows = await db.appointment.findMany({
    where: { appointmentDate: { gte: salonToUtc(day, '00:00'), lt: salonToUtc(addDays(day, 1), '00:00') } },
    include,
    orderBy: { appointmentDate: 'asc' },
  })
  return rows.map(toView)
}
