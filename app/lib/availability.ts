import 'server-only'
import { cacheLife, cacheTag } from 'next/cache'
import { db } from '@/lib/db'
import { salonToUtc, utcToSalon } from '@/lib/time'
import { addDays } from '@/lib/dates'
import { SALON_TAG } from '@/app/lib/settings'
import type { DayInfo, OpeningHours, Slot } from '@/app/lib/definitions'

// Everything that decides whether a time can be booked lives here, so the admin
// booking form and the client's calendar always agree:
// opening hours (clients only), calendar events (everyone), other appointments (everyone).

export const SLOT_STEP_MIN = 15
export const CLIENT_LEAD_MIN = 120 // clients can't pick a time sooner than this
export const CLIENT_HORIZON_DAYS = 60 // …or further ahead than this

// Statuses that keep a time slot taken; must match the database constraint.
const BLOCKING = ['SCHEDULED', 'HONORED', 'NOT_HONORED'] as const

export const DEFAULT_HOURS: OpeningHours = {
  '0': null,
  '1': { open: '09:00', close: '19:00' },
  '2': { open: '09:00', close: '19:00' },
  '3': { open: '09:00', close: '19:00' },
  '4': { open: '09:00', close: '19:00' },
  '5': { open: '09:00', close: '19:00' },
  '6': { open: '09:00', close: '14:00' },
}

// Same for everyone; cached and refreshed with the salon details.
export async function getOpeningHours(): Promise<OpeningHours> {
  'use cache'
  cacheTag(SALON_TAG)
  cacheLife('days')
  const row = await db.setting.findUnique({ where: { key: 'openingHours' } })
  return { ...DEFAULT_HOURS, ...((row?.value ?? {}) as Partial<OpeningHours>) }
}

type Interval = { start: number; end: number; title?: string } // epoch ms, end exclusive

const overlaps = (a: Interval, b: Interval) => a.start < b.end && b.start < a.end

// The first calendar event sharing time with [start, end), if any.
export async function findEventOverlap(start: Date, end: Date) {
  return db.calendarEvent.findFirst({
    where: { startsAt: { lt: end }, endsAt: { gt: start } },
    orderBy: { startsAt: 'asc' },
  })
}

// Appointments and events between two instants, as plain intervals.
async function busyBetween(from: Date, to: Date, excludeAppointmentId?: string) {
  const [appointments, events] = await Promise.all([
    db.appointment.findMany({
      where: {
        status: { in: [...BLOCKING] },
        appointmentDate: { lt: to },
        endsAt: { gt: from },
        ...(excludeAppointmentId && { id: { not: excludeAppointmentId } }),
      },
      select: { appointmentDate: true, endsAt: true },
    }),
    db.calendarEvent.findMany({ where: { startsAt: { lt: to }, endsAt: { gt: from } }, select: { startsAt: true, endsAt: true, title: true } }),
  ])
  return {
    appointments: appointments.map((a) => ({ start: a.appointmentDate.getTime(), end: a.endsAt.getTime() })),
    events: events.map((e) => ({ start: e.startsAt.getTime(), end: e.endsAt.getTime(), title: e.title })),
  }
}

type Busy = Awaited<ReturnType<typeof busyBetween>>

// Pure: the start times for one day and whether each is free. A slot needs the
// service to finish before closing; the cleanup buffer may run past it.
function daySlots(day: string, hours: OpeningHours, busy: Busy, service: { durationMin: number; bufferMin: number }, now: Date) {
  const weekday = String(new Date(`${day}T12:00:00Z`).getUTCDay()) as keyof OpeningHours
  const open = hours[weekday]
  if (!open) return { slots: [] as Slot[], closed: true as const }

  const dayStart = salonToUtc(day, '00:00').getTime()
  const dayEnd = salonToUtc(addDays(day, 1), '00:00').getTime()
  const allDayEvent = busy.events.find((e) => e.start <= dayStart && e.end >= dayEnd)
  if (allDayEvent) return { slots: [] as Slot[], closed: true as const, eventTitle: allDayEvent.title }

  const earliest = now.getTime() + CLIENT_LEAD_MIN * 60_000
  const [oh, om] = open.open.split(':').map(Number)
  const [ch, cm] = open.close.split(':').map(Number)
  const slots: Slot[] = []
  for (let min = oh * 60 + om; min + service.durationMin <= ch * 60 + cm; min += SLOT_STEP_MIN) {
    const time = `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`
    const start = salonToUtc(day, time).getTime()
    const slot = { start, end: start + (service.durationMin + service.bufferMin) * 60_000 }
    const free =
      start >= earliest && !busy.appointments.some((b) => overlaps(slot, b)) && !busy.events.some((e) => overlaps(slot, e))
    slots.push({ time, available: free })
  }
  return { slots, closed: false as const }
}

async function serviceTimes(serviceId: string) {
  const s = await db.service.findUnique({ where: { id: serviceId }, select: { durationMin: true, bufferMin: true } })
  if (!s) throw new Error('Service not found')
  return s
}

// The client's calendar: one month, each day marked past/closed/event/full/available.
export async function getMonthAvailability(month: string, serviceId: string, excludeAppointmentId: string): Promise<DayInfo[]> {
  const now = new Date()
  const today = utcToSalon(now).date
  const last = addDays(today, CLIENT_HORIZON_DAYS)
  const first = `${month}-01`
  const days: string[] = []
  for (let d = first; d.startsWith(month); d = addDays(d, 1)) days.push(d)

  const [hours, service, busy] = await Promise.all([
    getOpeningHours(),
    serviceTimes(serviceId),
    busyBetween(salonToUtc(first, '00:00'), salonToUtc(addDays(days.at(-1)!, 1), '00:00'), excludeAppointmentId),
  ])

  return days.map((date) => {
    if (date < today || date > last) return { date, state: 'past' }
    const result = daySlots(date, hours, busy, service, now)
    if (result.closed) return result.eventTitle ? { date, state: 'event', eventTitle: result.eventTitle } : { date, state: 'closed' }
    return { date, state: result.slots.some((s) => s.available) ? 'available' : 'full' }
  })
}

// The time slots of one day for the client's calendar.
export async function getDaySlots(day: string, serviceId: string, excludeAppointmentId: string) {
  const [hours, service, busy] = await Promise.all([
    getOpeningHours(),
    serviceTimes(serviceId),
    busyBetween(salonToUtc(day, '00:00'), salonToUtc(addDays(day, 1), '00:00'), excludeAppointmentId),
  ])
  const today = utcToSalon(new Date()).date
  if (day < today || day > addDays(today, CLIENT_HORIZON_DAYS)) return { slots: [] as Slot[], closed: true as const }
  return daySlots(day, hours, busy, service, new Date())
}

// Server-side re-check before moving an appointment to a client's chosen slot.
export async function isClientSlotFree(day: string, time: string, serviceId: string, excludeAppointmentId: string) {
  const { slots } = await getDaySlots(day, serviceId, excludeAppointmentId)
  return slots.some((s) => s.time === time && s.available)
}
