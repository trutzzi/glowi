import 'server-only'
import { db } from '@/lib/db'
import { logError } from '@/lib/logger'
import { sendSms, toGsmText } from '@/lib/sms'
import { SALON_TZ, salonToUtc, utcToSalon } from '@/lib/time'
import { addDays, toDbDate } from '@/lib/dates'
import { getSalonInfo } from '@/app/lib/settings'

// Appointment SMS:
// - a confirmation right after booking or rescheduling (sendAppointmentConfirmation)
// - a reminder at 10:00 the day before (sendDueReminders, run hourly)
// - a maintenance reminder at 10:00 on the due day (sendDueMaintenance, run hourly)
const SMS_LENGTH = 160
const REMINDER_FROM_HOUR = 10 // send the day-before reminder from 10:00…
const REMINDER_UNTIL_HOUR = 21 // …until 21:00, so nobody gets one at night

// "joi, 8 oct., ora 14:00" in Romanian (diacritics are stripped by toGsmText).
function whenRo(at: Date) {
  const day = new Intl.DateTimeFormat('ro-RO', { timeZone: SALON_TZ, weekday: 'long', day: 'numeric', month: 'short' }).format(at)
  const time = new Intl.DateTimeFormat('ro-RO', { timeZone: SALON_TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(at)
  return `${day}, ora ${time}`
}

// Builds a single-SMS text; a long service title is shortened rather than paying for a second SMS.
function fitOneSms(build: (service: string) => string, service: string) {
  let text = toGsmText(build(service))
  if (text.length > SMS_LENGTH) {
    const room = Math.max(8, service.length - (text.length - SMS_LENGTH) - 1)
    text = toGsmText(build(`${service.slice(0, room)}.`))
  }
  return text
}

const callUs = (phone: string | null) => (phone ? ` Pentru modificari sunati la ${phone}.` : '')

export function reminderText(firstName: string, start: Date, service: string, salon: string, phone: string | null) {
  return fitOneSms((s) => `Buna ${firstName}! Va reamintim programarea de maine, ${whenRo(start)}: ${s}, la ${salon}.${callUs(phone)}`, service)
}

export function confirmationText(kind: 'new' | 'moved', firstName: string, start: Date, service: string, salon: string, phone: string | null) {
  const what = kind === 'new' ? 'Programarea ta a fost confirmata' : 'Programarea ta a fost mutata'
  return fitOneSms((s) => `Buna ${firstName}! ${what}: ${s}, ${whenRo(start)}, la ${salon}.${callUs(phone)}`, service)
}

// Sent from the booking action via after(), so saving is never slowed down or
// blocked by SMSLink. Failures go to the error log.
export async function sendAppointmentConfirmation(appointmentId: string, kind: 'new' | 'moved') {
  const appt = await db.appointment.findUnique({
    where: { id: appointmentId },
    include: { user: { select: { name: true, phone: true } }, service: { select: { title: true } } },
  })
  // Only for visits still to come; past entries (logged afterwards) need no SMS.
  if (!appt || appt.status !== 'SCHEDULED' || appt.appointmentDate <= new Date() || !appt.user.phone) return

  const salon = await getSalonInfo()
  const text = confirmationText(kind, appt.user.name.split(' ')[0], appt.appointmentDate, appt.service.title, salon.name, salon.phone)
  const result = await sendSms(appt.user.phone, text)
  if (!result.ok) {
    await logError({ source: 'sms', message: `Confirmarea pentru programarea ${appt.id} nu s-a trimis: ${result.error}` })
  }
}

export type ReminderRun = { due: number; sent: number; failed: { appointmentId: string; error: string }[]; test: boolean }

// Reminders for tomorrow's appointments (salon time). The hourly job sends them
// from 10:00; the dashboard button (`manual`) sends them at any hour.
export async function sendDueReminders(now = new Date(), { manual = false } = {}): Promise<ReminderRun> {
  const run: ReminderRun = { due: 0, sent: 0, failed: [], test: process.env.SMSLINK_TEST === '1' }

  const hour = Number(utcToSalon(now).time.slice(0, 2))
  if (!manual && (hour < REMINDER_FROM_HOUR || hour >= REMINDER_UNTIL_HOUR)) return run

  const tomorrow = addDays(utcToSalon(now).date, 1)
  const due = await db.appointment.findMany({
    where: {
      status: 'SCHEDULED',
      reminderSentAt: null,
      appointmentDate: { gte: salonToUtc(tomorrow, '00:00'), lt: salonToUtc(addDays(tomorrow, 1), '00:00') },
      user: { phone: { not: null } },
    },
    include: { user: { select: { name: true, phone: true } }, service: { select: { title: true } } },
    orderBy: { appointmentDate: 'asc' },
  })
  run.due = due.length

  const salon = await getSalonInfo()
  for (const appt of due) {
    // Claim it first, so two overlapping runs can't both send.
    const claimed = await db.appointment.updateMany({
      where: { id: appt.id, reminderSentAt: null, status: 'SCHEDULED' },
      data: { reminderSentAt: new Date() },
    })
    if (claimed.count === 0) continue

    const firstName = appt.user.name.split(' ')[0]
    const result = await sendSms(appt.user.phone!, reminderText(firstName, appt.appointmentDate, appt.service.title, salon.name, salon.phone))
    if (result.ok) {
      run.sent++
    } else {
      // Release the claim so the next run retries.
      await db.appointment.update({ where: { id: appt.id }, data: { reminderSentAt: null } })
      run.failed.push({ appointmentId: appt.id, error: result.error })
      await logError({ source: 'sms', message: `Reminder pentru programarea ${appt.id} nu s-a trimis: ${result.error}` })
    }
  }
  return run
}

export function maintenanceText(firstName: string, weeks: number, service: string, salon: string, phone: string | null) {
  const when = weeks === 1 ? 'o saptamana' : `${weeks} saptamani`
  const book = phone ? ` Programeaza-te la ${phone}.` : ' Te asteptam!'
  return fitOneSms((s) => `Buna ${firstName}! Au trecut ${when} de la ultima vizita pentru ${s} la ${salon}.${book}`, service)
}

export type MaintenanceRun = { due: number; sent: number; skippedBooked: number; failed: number }

// One SMS per maintenance cycle, at 10:00 on (or after) the due day. Skipped
// when the client already booked that service, or turned maintenance off.
export async function sendDueMaintenance(now = new Date(), { manual = false } = {}): Promise<MaintenanceRun> {
  const run: MaintenanceRun = { due: 0, sent: 0, skippedBooked: 0, failed: 0 }
  const hour = Number(utcToSalon(now).time.slice(0, 2))
  if (!manual && (hour < REMINDER_FROM_HOUR || hour >= REMINDER_UNTIL_HOUR)) return run

  const today = utcToSalon(now).date
  const due = await db.maintenance.findMany({
    where: { active: true, clientDeclined: false, smsSentAt: null, dueDate: { lte: toDbDate(today) }, user: { phone: { not: null } } },
    include: { user: { select: { name: true, phone: true } }, service: { select: { title: true } } },
  })
  run.due = due.length
  const salon = await getSalonInfo()

  for (const m of due) {
    const booked = await db.appointment.count({
      where: { userId: m.userId, serviceId: m.serviceId, status: 'SCHEDULED', appointmentDate: { gt: now } },
    })
    if (booked) {
      run.skippedBooked++
      continue // the next honored visit starts a new cycle
    }
    const claimed = await db.maintenance.updateMany({ where: { id: m.id, smsSentAt: null }, data: { smsSentAt: new Date() } })
    if (claimed.count === 0) continue

    const text = maintenanceText(m.user.name.split(' ')[0], m.intervalWeeks, m.service.title, salon.name, salon.phone)
    const result = await sendSms(m.user.phone!, text)
    if (result.ok) {
      run.sent++
    } else {
      await db.maintenance.update({ where: { id: m.id }, data: { smsSentAt: null } }) // retry next run
      run.failed++
      await logError({ source: 'sms', message: `SMS de întreținere (${m.id}) nu s-a trimis: ${result.error}` })
    }
  }
  return run
}

export type RequestSms = 'cancel-approved' | 'reschedule-approved' | 'rejected'

// SMS to the client after the admin answers a cancel/reschedule request.
export async function sendRequestDecision(requestId: string, kind: RequestSms) {
  const r = await db.appointmentRequest.findUnique({
    where: { id: requestId },
    include: { user: { select: { name: true, phone: true } }, appointment: { include: { service: { select: { title: true } } } } },
  })
  if (!r?.user.phone) return
  const salon = await getSalonInfo()
  const firstName = r.user.name.split(' ')[0]
  const when = whenRo(r.appointment.appointmentDate)
  const what = kind === 'rejected' ? (r.type === 'CANCEL' ? 'anularea' : 'reprogramarea') : ''
  const text = fitOneSms((s) => {
    if (kind === 'cancel-approved') return `Buna ${firstName}! Programarea ta la ${salon.name} (${s}, ${when}) a fost anulata.${callUs(salon.phone)}`
    if (kind === 'reschedule-approved') return `Buna ${firstName}! ${salon.name}: poti alege acum o noua ora pentru ${s} din aplicatie, la Programarile mele.`
    return `Buna ${firstName}! ${salon.name} nu a putut aproba ${what} pentru ${s}, ${when}.${callUs(salon.phone)}`
  }, r.appointment.service.title)

  const result = await sendSms(r.user.phone, text)
  if (!result.ok) await logError({ source: 'sms', message: `SMS pentru cererea ${r.id} nu s-a trimis: ${result.error}` })
}
