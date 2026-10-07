'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireRole } from '@/app/lib/dal'
import { salonToUtc } from '@/lib/time'
import { addDays } from '@/lib/dates'
import type { EventFormState } from '@/app/lib/definitions'

const Day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Alege o dată')
const Time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Alege o oră')

const EventSchema = z.discriminatedUnion('allDay', [
  z.object({ allDay: z.literal('on'), title: z.string().trim().min(2, 'Scrie un titlu').max(80), notes: z.string().trim().max(300), startDay: Day, endDay: Day }),
  z.object({ allDay: z.literal('off'), title: z.string().trim().min(2, 'Scrie un titlu').max(80), notes: z.string().trim().max(300), day: Day, from: Time, to: Time }),
])

// Creates an event that blocks bookings. Appointments already inside it are kept
// and returned, so the admin can move or cancel them.
export async function createEvent(_prev: EventFormState, formData: FormData): Promise<EventFormState> {
  await requireRole('admin')
  const raw = Object.fromEntries([...formData.entries()].filter(([k, v]) => !k.startsWith('$') && typeof v === 'string'))
  const parsed = EventSchema.safeParse({ ...raw, allDay: raw.allDay === 'on' ? 'on' : 'off' })
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors }
  const e = parsed.data

  let startsAt: Date, endsAt: Date
  if (e.allDay === 'on') {
    if (e.endDay < e.startDay) return { errors: { endDay: ['Ziua de final e înaintea celei de început'] } }
    startsAt = salonToUtc(e.startDay, '00:00')
    endsAt = salonToUtc(addDays(e.endDay, 1), '00:00') // through the end of the last day
  } else {
    if (e.to <= e.from) return { errors: { to: ['Ora de final trebuie să fie după cea de început'] } }
    startsAt = salonToUtc(e.day, e.from)
    endsAt = salonToUtc(e.day, e.to)
  }

  await db.calendarEvent.create({ data: { title: e.title, notes: e.notes || null, allDay: e.allDay === 'on', startsAt, endsAt } })

  const conflicts = await db.appointment.findMany({
    where: { status: 'SCHEDULED', appointmentDate: { lt: endsAt }, endsAt: { gt: startsAt } },
    include: { user: { select: { name: true } } },
    orderBy: { appointmentDate: 'asc' },
  })
  return { ok: true, conflicts: conflicts.map((a) => ({ id: a.id, clientName: a.user.name, start: a.appointmentDate.toISOString() })) }
}

export async function deleteEvent(id: string, back: string) {
  await requireRole('admin')
  await db.calendarEvent.deleteMany({ where: { id } })
  redirect(back)
}
