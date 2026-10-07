'use server'

import { redirect } from 'next/navigation'
import { after } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireRole, verifySession } from '@/app/lib/dal'
import { isClientSlotFree } from '@/app/lib/availability'
import { sendAppointmentConfirmation, sendRequestDecision } from '@/lib/reminders'
import { salonToUtc } from '@/lib/time'

export type RequestFormState = { error?: string }

const NOTICE_MS = 24 * 60 * 60 * 1000 // cancellation asked at least 24h ahead = "Anulată la timp"
const Message = z.string().trim().max(300, 'Maxim 300 de caractere')

// ---- Client ----------------------------------------------------------------

// A client asks to cancel or move one of their upcoming appointments.
export async function createRequest(
  appointmentId: string,
  type: 'CANCEL' | 'RESCHEDULE',
  _prev: RequestFormState,
  formData: FormData
): Promise<RequestFormState> {
  const session = await verifySession()
  if (session.role !== 'client') return { error: 'Doar pentru clienți' }
  const message = Message.safeParse(formData.get('message') ?? '')
  if (!message.success) return { error: message.error.issues[0].message }

  const appt = await db.appointment.findFirst({ where: { id: appointmentId, userId: String(session.userId) } })
  if (!appt || appt.status !== 'SCHEDULED' || appt.appointmentDate <= new Date()) {
    return { error: 'Programarea nu mai poate fi modificată' }
  }
  try {
    await db.appointmentRequest.create({
      data: { appointmentId, userId: String(session.userId), type, message: message.data || null },
    })
  } catch (error) {
    // The partial unique index allows one open request per appointment.
    if (String(error).includes('AppointmentRequest_one_open_per_appointment') || (error as { code?: string }).code === 'P2002') {
      return { error: 'Ai deja o cerere în curs pentru această programare' }
    }
    throw error
  }
  redirect('/appointments?cerere=trimisa')
}

export async function withdrawRequest(requestId: string) {
  const session = await verifySession()
  await db.appointmentRequest.updateMany({
    where: { id: requestId, userId: String(session.userId), status: { in: ['PENDING', 'APPROVED'] } },
    data: { status: 'WITHDRAWN', completedAt: new Date() },
  })
  redirect('/appointments')
}

// After the admin approved a reschedule, the client picks the new time.
export async function pickRescheduleSlot(requestId: string, day: string, time: string) {
  const session = await verifySession()
  const req = await db.appointmentRequest.findFirst({
    where: { id: requestId, userId: String(session.userId), type: 'RESCHEDULE', status: 'APPROVED' },
    include: { appointment: { include: { service: true } } },
  })
  if (!req || req.appointment.status !== 'SCHEDULED') redirect('/appointments')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !/^\d{2}:\d{2}$/.test(time)) redirect('/appointments')

  const { appointment: appt } = req
  const back = `/appointments/${appt.id}/reschedule?zi=${day}`
  // Re-check on the server: the page may be stale, or someone booked meanwhile.
  if (!(await isClientSlotFree(day, time, appt.serviceId, appt.id))) redirect(`${back}&eroare=ocupat`)

  const start = salonToUtc(day, time)
  const end = new Date(start.getTime() + (appt.service.durationMin + appt.service.bufferMin) * 60_000)
  try {
    await db.$transaction([
      db.appointment.update({ where: { id: appt.id }, data: { appointmentDate: start, endsAt: end, reminderSentAt: null } }),
      db.appointmentRequest.update({ where: { id: req.id }, data: { status: 'COMPLETED', completedAt: new Date() } }),
    ])
  } catch (error) {
    // Two people taking the same slot at once: the database refuses the second.
    if (String(error).includes('Appointment_no_double_booking')) redirect(`${back}&eroare=ocupat`)
    throw error
  }
  after(() => sendAppointmentConfirmation(appt.id, 'moved'))
  redirect('/appointments?mutata=1')
}

// ---- Admin -----------------------------------------------------------------

export async function approveRequest(requestId: string) {
  await requireRole('admin')
  const req = await db.appointmentRequest.findUnique({ where: { id: requestId }, include: { appointment: true } })
  if (!req || req.status !== 'PENDING') redirect('/admin/requests')

  if (req.type === 'CANCEL') {
    // The status depends on when the client asked, not when the admin answered.
    const inTime = req.appointment.appointmentDate.getTime() - req.createdAt.getTime() >= NOTICE_MS
    const now = new Date()
    await db.$transaction([
      db.appointment.update({
        where: { id: req.appointmentId },
        data: { status: inTime ? 'MISSED_ANNOUNCED' : 'MISSED_SHORT_NOTICE', lateMinutes: null },
      }),
      db.appointmentRequest.update({ where: { id: req.id }, data: { status: 'COMPLETED', decidedAt: now, completedAt: now } }),
    ])
    after(() => sendRequestDecision(req.id, 'cancel-approved'))
  } else {
    await db.appointmentRequest.update({ where: { id: req.id }, data: { status: 'APPROVED', decidedAt: new Date() } })
    after(() => sendRequestDecision(req.id, 'reschedule-approved'))
  }
  redirect('/admin/requests')
}

export async function rejectRequest(requestId: string, formData: FormData) {
  await requireRole('admin')
  const note = Message.safeParse(formData.get('adminNote') ?? '')
  const updated = await db.appointmentRequest.updateMany({
    where: { id: requestId, status: 'PENDING' },
    data: { status: 'REJECTED', decidedAt: new Date(), adminNote: (note.success && note.data) || null },
  })
  if (updated.count) after(() => sendRequestDecision(requestId, 'rejected'))
  redirect('/admin/requests')
}
