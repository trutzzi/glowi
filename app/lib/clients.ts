import 'server-only'
import { db } from '@/lib/db'
import { requireRole } from '@/app/lib/dal'
import type { ClientHistoryItem, ClientListItem, ClientStats, ClientView } from '@/app/lib/definitions'

// Client data is personal, so it is never cached; every read checks the admin role.

export async function getClients(query = ''): Promise<ClientListItem[]> {
  await requireRole('admin')
  const q = query.trim()
  return db.user.findMany({
    where: {
      role: 'CLIENT',
      ...(q && {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
          { phone: { contains: q } },
        ],
      }),
    },
    select: { id: true, name: true, email: true, phone: true },
    orderBy: { name: 'asc' },
  })
}

export async function getClientById(id: string): Promise<ClientView | null> {
  await requireRole('admin')
  const u = await db.user.findFirst({ where: { id, role: 'CLIENT' } })
  if (!u) return null
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    birthday: u.birthday ? u.birthday.toISOString().slice(0, 10) : null,
    allergies: u.allergies,
    privateNotes: u.privateNotes,
    smsMarketingConsent: u.smsMarketingConsent,
    emailMarketingConsent: u.emailMarketingConsent,
    consentUpdatedAt: u.consentUpdatedAt?.toISOString() ?? null,
  }
}

// Every appointment of one client, newest first, plus a summary. Admin only.
export async function getClientHistory(clientId: string): Promise<{ items: ClientHistoryItem[]; stats: ClientStats }> {
  await requireRole('admin')
  const rows = await db.appointment.findMany({
    where: { userId: clientId },
    include: { service: { select: { title: true } } },
    orderBy: { appointmentDate: 'desc' },
  })

  const items = rows.map((a) => ({
    id: a.id,
    serviceTitle: a.service.title,
    start: a.appointmentDate.toISOString(),
    end: a.endsAt.toISOString(),
    price: a.price.toFixed(2),
    status: a.status,
    lateMinutes: a.lateMinutes,
    notes: a.notes,
  }))

  const honored = rows.filter((a) => a.status === 'HONORED')
  const stats: ClientStats = {
    honored: honored.length,
    lateArrivals: honored.filter((a) => a.lateMinutes).length,
    noShows: rows.filter((a) => a.status === 'NOT_HONORED').length,
    cancelledLate: rows.filter((a) => a.status === 'MISSED_SHORT_NOTICE').length,
    cancelledInTime: rows.filter((a) => a.status === 'MISSED_ANNOUNCED').length,
    totalSpent: honored.reduce((sum, a) => sum + Number(a.price), 0).toFixed(2),
    lastVisit: honored[0]?.appointmentDate.toISOString() ?? null, // rows are newest first
  }
  return { items, stats }
}
