'use server'

import { redirect } from 'next/navigation'
import { after } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireRole } from '@/app/lib/dal'
import { formatDateTime, formatTime, salonToUtc, utcToSalon } from '@/lib/time'
import { addDays, toDbDate } from '@/lib/dates'
import { sendAppointmentConfirmation } from '@/lib/reminders'
import { findEventOverlap } from '@/app/lib/availability'
import { APPOINTMENT_STATUSES, LATE_MINUTES, type AppointmentFormState, type AppointmentStatus } from '@/app/lib/definitions'

// Statuses that keep the time slot taken. Must match the WHERE clause of the
// "Appointment_no_double_booking" constraint in the migrations.
const BLOCKING: AppointmentStatus[] = ['SCHEDULED', 'HONORED', 'NOT_HONORED']
// Recording these only makes sense once the visit has started.
const NEEDS_STARTED: AppointmentStatus[] = ['HONORED', 'NOT_HONORED']

const AppointmentSchema = z.object({
  id: z.string().optional(),
  clientId: z.string().min(1, 'Alege un client'),
  serviceId: z.string().min(1, 'Alege un serviciu'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Alege o dată'),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Alege o oră'),
  notes: z
    .string()
    .trim()
    .max(1000)
    .transform((v) => v || null),
})

// The first appointment that would share time with [start, end), if any.
async function findOverlap(start: Date, end: Date, excludeId?: string) {
  return db.appointment.findFirst({
    where: {
      status: { in: BLOCKING },
      appointmentDate: { lt: end },
      endsAt: { gt: start },
      ...(excludeId && { id: { not: excludeId } }),
    },
    include: { user: { select: { name: true } }, service: { select: { title: true } } },
    orderBy: { appointmentDate: 'asc' },
  })
}

type Overlap = NonNullable<Awaited<ReturnType<typeof findOverlap>>>
const overlapMessage = (o: Overlap) =>
  `Intervalul se suprapune cu ${o.service.title} pentru ${o.user.name}, ${formatTime(o.appointmentDate)}–${formatTime(o.endsAt)} (inclusiv pauza).`

// The database rejects overlaps too (exclusion constraint), which catches two
// bookings made at the same moment. Postgres reports that as error 23P01.
function isOverlapViolation(error: unknown) {
  const text = `${String(error)} ${JSON.stringify(error, Object.getOwnPropertyNames(error ?? {}))}`
  return text.includes('Appointment_no_double_booking') || text.includes('23P01')
}

// Which confirmation SMS a save needs: a different client is a new booking for
// them; a new time or service is a move; anything else needs none.
function smsKindOf(
  existing: { userId: string; serviceId: string } | null,
  clientId: string,
  serviceId: string,
  moved: boolean
): 'new' | 'moved' | null {
  if (!existing || existing.userId !== clientId) return 'new'
  return moved || existing.serviceId !== serviceId ? 'moved' : null
}

// The admin handled the appointment directly, so open client requests about it are done.
async function closeOpenRequests(appointmentId: string) {
  await db.appointmentRequest.updateMany({
    where: { appointmentId, status: { in: ['PENDING', 'APPROVED'] } },
    data: { status: 'COMPLETED', completedAt: new Date() },
  })
}

// Books an appointment, or reschedules one when the form includes an id.
export async function saveAppointment(_prev: AppointmentFormState, formData: FormData): Promise<AppointmentFormState> {
  await requireRole('admin') // re-check in every action; never trust the page

  const values = Object.fromEntries(
    [...formData.entries()].filter(([k, v]) => !k.startsWith('$') && typeof v === 'string').map(([k, v]) => [k, String(v)])
  )
  const parsed = AppointmentSchema.safeParse(values)
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors, values }
  const { id, clientId, serviceId, date, time, notes } = parsed.data

  const existing = id ? await db.appointment.findUnique({ where: { id } }) : null
  if (id && !existing) return { message: 'Această programare nu mai există', values }

  const [client, service] = await Promise.all([
    db.user.findFirst({ where: { id: clientId, role: 'CLIENT' }, select: { id: true } }),
    db.service.findUnique({ where: { id: serviceId } }),
  ])
  if (!client) return { errors: { clientId: ['Alege un client'] }, values }
  // Hidden services can't be booked, but an existing booking may keep its service.
  if (!service || (!service.active && existing?.serviceId !== serviceId)) {
    return { errors: { serviceId: ['Alege un serviciu activ'] }, values }
  }

  const start = salonToUtc(date, time)
  const end = new Date(start.getTime() + (service.durationMin + service.bufferMin) * 60_000)

  // Calendar events close the salon for everyone, the admin included.
  const event = await findEventOverlap(start, end)
  if (event) {
    return { errors: { time: [`Salonul este închis atunci: ${event.title} (${formatDateTime(event.startsAt)} – ${formatDateTime(event.endsAt)}).`] }, values }
  }

  // Only slot-taking appointments are checked; a cancelled one may be edited freely.
  if (!existing || BLOCKING.includes(existing.status)) {
    const overlap = await findOverlap(start, end, id)
    if (overlap) return { errors: { time: [overlapMessage(overlap)] }, values, conflictId: overlap.id }
  }

  // Keep the agreed price unless the service changed.
  const price = existing && existing.serviceId === serviceId ? existing.price : service.price
  const moved = existing && existing.appointmentDate.getTime() !== start.getTime()
  const data = {
    userId: clientId,
    serviceId,
    appointmentDate: start,
    endsAt: end,
    price,
    notes,
    // A new time needs a new reminder.
    ...(moved && { reminderSentAt: null }),
  }

  let appointmentId = id
  try {
    if (existing) {
      await db.appointment.update({ where: { id: existing.id }, data })
    } else {
      appointmentId = (await db.appointment.create({ data })).id
    }
  } catch (error) {
    if (isOverlapViolation(error)) {
      return { errors: { time: ['Cineva tocmai a ocupat un interval suprapus. Alege altă oră.'] }, values }
    }
    throw error
  }

  // The admin moved it directly, so any open client request about it is settled.
  if (existing && smsKindOf(existing, clientId, serviceId, Boolean(moved))) await closeOpenRequests(existing.id)

  // SMS to the client after the response is sent, so SMSLink never slows down saving.
  // A different client counts as a new booking for them; a new time or service as a move.
  const smsKind = smsKindOf(existing, clientId, serviceId, Boolean(moved))
  if (smsKind && appointmentId) {
    const bookedId = appointmentId
    after(() => sendAppointmentConfirmation(bookedId, smsKind))
  }

  redirect(`/admin/appointments/${appointmentId}?saved=1`)
}

// Records what happened (or reopens a cancelled appointment as SCHEDULED).
// Called from plain forms, so problems come back as ?error= on the page.
export async function setAppointmentStatus(id: string, status: AppointmentStatus) {
  await requireRole('admin')
  if (!APPOINTMENT_STATUSES.includes(status)) throw new Error('Unknown status')

  const appt = await db.appointment.findUnique({ where: { id } })
  if (!appt) redirect('/admin/appointments')

  if (NEEDS_STARTED.includes(status) && appt.appointmentDate > new Date()) {
    redirect(`/admin/appointments/${id}?error=not-started`)
  }
  // Re-taking a slot (e.g. undoing a cancellation) must not create an overlap.
  if (BLOCKING.includes(status) && !BLOCKING.includes(appt.status)) {
    const overlap = await findOverlap(appt.appointmentDate, appt.endsAt, id)
    if (overlap) redirect(`/admin/appointments/${id}?error=overlap&with=${overlap.id}`)
  }

  try {
    // Any status other than "late" clears a previously recorded delay.
    await db.appointment.update({ where: { id }, data: { status, lateMinutes: null } })
    if (status !== 'SCHEDULED') await closeOpenRequests(id)
  } catch (error) {
    if (isOverlapViolation(error)) redirect(`/admin/appointments/${id}?error=overlap`)
    throw error
  }
  redirect(`/admin/appointments/${id}`)
}

// Marks a visit HONORED (optionally late) and records the "Întreținere?" answer
// from the popup in the same step. Form fields: maintenance = "yes" | "no"
// (absent when the service has no maintenance), weeks = interval for this client.
export async function recordHonored(id: string, lateMinutes: number | null, formData: FormData) {
  await requireRole('admin')
  if (lateMinutes !== null && !(LATE_MINUTES as readonly number[]).includes(lateMinutes)) throw new Error('Unknown delay')

  const appt = await db.appointment.findUnique({ where: { id }, include: { service: { select: { maintenanceWeeks: true } } } })
  if (!appt) redirect('/admin/appointments')
  if (appt.appointmentDate > new Date()) redirect(`/admin/appointments/${id}?error=not-started`)
  // Coming back from a cancellation re-takes the slot, so it must still be free.
  const overlap = !BLOCKING.includes(appt.status) && (await findOverlap(appt.appointmentDate, appt.endsAt, id))
  if (overlap) redirect(`/admin/appointments/${id}?error=overlap&with=${overlap.id}`)

  try {
    await db.appointment.update({ where: { id }, data: { status: 'HONORED', lateMinutes } })
    await closeOpenRequests(id)
  } catch (error) {
    if (isOverlapViolation(error)) redirect(`/admin/appointments/${id}?error=overlap`)
    throw error
  }

  const answer = formData.get('maintenance')
  if (appt.service.maintenanceWeeks && (answer === 'yes' || answer === 'no')) {
    const key = { userId_serviceId: { userId: appt.userId, serviceId: appt.serviceId } }
    const existing = await db.maintenance.findUnique({ where: key })
    if (answer === 'yes' && !existing?.clientDeclined) {
      // A new cycle starts from this visit.
      const weeks = Math.min(52, Math.max(1, Math.round(Number(formData.get('weeks')) || appt.service.maintenanceWeeks)))
      const cycle = {
        intervalWeeks: weeks,
        lastVisitAt: appt.appointmentDate,
        dueDate: toDbDate(addDays(utcToSalon(appt.appointmentDate).date, weeks * 7)),
        active: true,
        smsSentAt: null,
      }
      await db.maintenance.upsert({ where: key, update: cycle, create: { userId: appt.userId, serviceId: appt.serviceId, ...cycle } })
    } else if (answer === 'no' && existing?.active) {
      await db.maintenance.update({ where: key, data: { active: false } })
    }
  }
  redirect(`/admin/appointments/${id}`)
}
