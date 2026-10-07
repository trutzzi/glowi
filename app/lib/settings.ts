import 'server-only'
import { cacheLife, cacheTag } from 'next/cache'
import { db } from '@/lib/db'
import { requireRole } from '@/app/lib/dal'
import type { Announcement, SalonInfo, SetupProgress } from '@/app/lib/definitions'

export const ANNOUNCEMENT_TAG = 'announcement'
export const SALON_TAG = 'salon'
const EMPTY: Announcement = { enabled: false, title: '', body: '' }

// Same for every client, so cached on the server; saveAnnouncement() refreshes it.
export async function getAnnouncement(): Promise<Announcement> {
  'use cache'
  cacheTag(ANNOUNCEMENT_TAG)
  cacheLife('hours')
  const row = await db.setting.findUnique({ where: { key: 'clientAnnouncement' } })
  return row ? { ...EMPTY, ...(row.value as Partial<Announcement>) } : EMPTY
}

export async function isAdminGuideHidden(): Promise<boolean> {
  await requireRole('admin')
  const row = await db.setting.findUnique({ where: { key: 'adminGuideHidden' } })
  return row?.value === true
}

export async function getSetupProgress(): Promise<SetupProgress> {
  await requireRole('admin')
  const [services, clients, appointments, attendanceRecorded, announcement] = await Promise.all([
    db.service.count({ where: { active: true } }),
    db.user.count({ where: { role: 'CLIENT' } }),
    db.appointment.count(),
    db.appointment.count({ where: { status: { not: 'SCHEDULED' } } }),
    getAnnouncement(),
  ])
  return {
    services,
    clients,
    appointments,
    attendanceRecorded,
    smsLive: Boolean(process.env.SMSLINK_CONNECTION_ID && process.env.SMSLINK_PASSWORD) && process.env.SMSLINK_TEST !== '1',
    announcement: announcement.enabled && Boolean(announcement.title || announcement.body),
  }
}

// Salon name and phone. Falls back to SALON_NAME / SALON_PHONE in .env, then a default.
// Public (the welcome screen shows it), cached, refreshed by saveSalonInfo().
export async function getSalonInfo(): Promise<SalonInfo> {
  'use cache'
  cacheTag(SALON_TAG)
  cacheLife('days')
  const row = await db.setting.findUnique({ where: { key: 'salon' } })
  const saved = (row?.value ?? {}) as Partial<SalonInfo>
  return {
    name: saved.name || process.env.SALON_NAME || 'Stylish Salon',
    phone: saved.phone ?? (process.env.SALON_PHONE || null),
  }
}
