'use server'

import { updateTag } from 'next/cache'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireRole, verifySession } from '@/app/lib/dal'
import { CURRENT_USER_TAG } from '@/app/actions/auth'
import type { ProfileFormState } from '@/app/lib/definitions'

const NewPassword = z
  .string()
  .min(8, 'Minim 8 caractere')
  .regex(/[a-zA-Z]/, 'Include o literă')
  .regex(/[0-9]/, 'Include o cifră')

// Any logged-in user, for their own account only (the id comes from the session).
export async function changePassword(_prev: ProfileFormState, formData: FormData): Promise<ProfileFormState> {
  const session = await verifySession()
  const current = String(formData.get('currentPassword') ?? '')
  const next = String(formData.get('newPassword') ?? '')
  const confirm = String(formData.get('confirmPassword') ?? '')

  const user = await db.user.findUnique({ where: { id: String(session.userId) }, select: { id: true, passwordHash: true } })
  if (!user || !(await bcrypt.compare(current, user.passwordHash))) {
    return { errors: { currentPassword: ['Parola actuală nu este corectă'] } }
  }
  const parsed = NewPassword.safeParse(next)
  if (!parsed.success) return { errors: { newPassword: parsed.error.issues.map((i) => i.message) } }
  if (next !== confirm) return { errors: { confirmPassword: ['Parolele nu coincid'] } }
  if (next === current) return { errors: { newPassword: ['Alege o parolă diferită de cea actuală'] } }

  await db.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(next, 10) } })
  return { ok: true, message: 'Parola a fost schimbată.' }
}

// A client controls their own marketing consent (GDPR: they must be able to withdraw it).
export async function updateMyConsent(_prev: ProfileFormState, formData: FormData): Promise<ProfileFormState> {
  const session = await verifySession()
  if (session.role !== 'client') return { message: 'Doar pentru clienți' }

  const sms = formData.get('smsMarketingConsent') === 'on'
  const email = formData.get('emailMarketingConsent') === 'on'
  const user = await db.user.findUnique({
    where: { id: String(session.userId) },
    select: { smsMarketingConsent: true, emailMarketingConsent: true },
  })
  if (!user) return { message: 'Contul nu mai există' }

  const changed = user.smsMarketingConsent !== sms || user.emailMarketingConsent !== email
  if (changed) {
    await db.user.update({
      where: { id: String(session.userId) },
      data: { smsMarketingConsent: sms, emailMarketingConsent: email, consentUpdatedAt: new Date() },
    })
  }
  return { ok: true, message: changed ? 'Preferințele au fost salvate.' : 'Nicio modificare.' }
}

const AdminProfileSchema = z.object({
  name: z.string().trim().min(2, 'Numele trebuie să aibă cel puțin 2 caractere').max(80),
  email: z.email('Introdu un email valid').trim().toLowerCase(),
})

// The admin's own name and login email.
export async function updateAdminProfile(_prev: ProfileFormState, formData: FormData): Promise<ProfileFormState> {
  const session = await requireRole('admin')
  const parsed = AdminProfileSchema.safeParse({ name: formData.get('name'), email: formData.get('email') })
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors }

  const taken = await db.user.findUnique({ where: { email: parsed.data.email }, select: { id: true } })
  if (taken && taken.id !== session.userId) return { errors: { email: ['Acest email este deja folosit de alt cont'] } }

  await db.user.update({ where: { id: String(session.userId) }, data: parsed.data })
  updateTag(CURRENT_USER_TAG) // the name is shown from the cached current user elsewhere
  return { ok: true, message: 'Profil salvat.' }
}
