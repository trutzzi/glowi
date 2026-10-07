import 'server-only'
import { db } from '@/lib/db'
import { requireRole } from '@/app/lib/dal'
import { salonToUtc, utcToSalon } from '@/lib/time'
import { addDays } from '@/lib/dates'
import type { CalendarEventView } from '@/app/lib/definitions'

const toView = (e: { id: string; title: string; startsAt: Date; endsAt: Date; allDay: boolean; notes: string | null }): CalendarEventView => ({
  id: e.id,
  title: e.title,
  start: e.startsAt.toISOString(),
  end: e.endsAt.toISOString(),
  allDay: e.allDay,
  notes: e.notes,
})

// Admin month view: events overlapping the month and appointment counts per day.
export async function getAdminMonth(month: string) {
  await requireRole('admin')
  const first = `${month}-01`
  let last = first
  while (addDays(last, 1).startsWith(month)) last = addDays(last, 1)
  const from = salonToUtc(first, '00:00')
  const to = salonToUtc(addDays(last, 1), '00:00')

  const [events, appointments] = await Promise.all([
    db.calendarEvent.findMany({ where: { startsAt: { lt: to }, endsAt: { gt: from } }, orderBy: { startsAt: 'asc' } }),
    db.appointment.findMany({
      where: { appointmentDate: { gte: from, lt: to }, status: { in: ['SCHEDULED', 'HONORED', 'NOT_HONORED'] } },
      select: { appointmentDate: true },
    }),
  ])
  const perDay = new Map<string, number>()
  for (const a of appointments) {
    const day = utcToSalon(a.appointmentDate).date
    perDay.set(day, (perDay.get(day) ?? 0) + 1)
  }
  return { events: events.map(toView), appointmentsPerDay: Object.fromEntries(perDay) }
}

export async function getUpcomingEvents(): Promise<CalendarEventView[]> {
  await requireRole('admin')
  const rows = await db.calendarEvent.findMany({ where: { endsAt: { gt: new Date() } }, orderBy: { startsAt: 'asc' }, take: 50 })
  return rows.map(toView)
}
