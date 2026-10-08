import 'server-only'
import { db } from '@/lib/db'
import { verifySession } from '@/app/lib/dal'
import { demoProfile, isDemo } from '@/app/lib/demo'
import type { MyProfile } from '@/app/lib/definitions'

// The logged-in user's own profile. The id comes from the session, never from
// the caller, and admin-only fields (privateNotes) are left out.
export async function getMyProfile(): Promise<MyProfile | null> {
  const session = await verifySession()
  if (isDemo(session.userId)) return demoProfile()
  const userId = String(session.userId)
  const [u, honoredVisits] = await Promise.all([
    db.user.findUnique({ where: { id: userId } }),
    db.appointment.count({ where: { userId, status: 'HONORED' } }),
  ])
  if (!u) return null
  return {
    id: u.id,
    role: u.role === 'ADMIN' ? 'admin' : 'client',
    name: u.name,
    email: u.email,
    phone: u.phone,
    birthday: u.birthday ? u.birthday.toISOString().slice(0, 10) : null,
    allergies: u.allergies,
    smsMarketingConsent: u.smsMarketingConsent,
    emailMarketingConsent: u.emailMarketingConsent,
    consentUpdatedAt: u.consentUpdatedAt?.toISOString() ?? null,
    memberSince: u.createdAt.toISOString(),
    honoredVisits,
  }
}
