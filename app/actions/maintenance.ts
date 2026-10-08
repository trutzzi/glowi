'use server'

import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { requireRole, verifySession } from '@/app/lib/dal'
import { utcToSalon } from '@/lib/time'
import { addDays, toDbDate } from '@/lib/dates'
import { isDemo } from '@/app/lib/demo'

// Admin: change one client's interval; the due date moves with it.
export async function updateMaintenanceWeeks(id: string, back: string, formData: FormData) {
  await requireRole('admin')
  const weeks = Math.round(Number(formData.get('weeks')))
  if (!(weeks >= 1 && weeks <= 52)) redirect(back)
  const m = await db.maintenance.findUnique({ where: { id } })
  if (m) {
    const dueDate = toDbDate(addDays(utcToSalon(m.lastVisitAt).date, weeks * 7))
    await db.maintenance.update({ where: { id }, data: { intervalWeeks: weeks, dueDate, smsSentAt: null } })
  }
  redirect(back)
}

// Admin: stop or restart. A client who declined can only be restarted by the client.
export async function setMaintenanceActive(id: string, active: boolean, back: string) {
  await requireRole('admin')
  await db.maintenance.updateMany({ where: { id, ...(active && { clientDeclined: false }) }, data: { active } })
  redirect(back)
}

// Client: turn their own maintenance off (we stop sending) or back on.
export async function setMyMaintenance(id: string, enabled: boolean) {
  const session = await verifySession()
  if (isDemo(session.userId)) redirect('/profile?demo=1')
  // userId in the filter: a client can only change their own rows.
  await db.maintenance.updateMany({
    where: { id, userId: String(session.userId) },
    data: enabled ? { clientDeclined: false, active: true } : { clientDeclined: true },
  })
  redirect('/profile')
}
