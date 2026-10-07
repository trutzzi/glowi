'use server'

import { redirect } from 'next/navigation'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireRole } from '@/app/lib/dal'
import type { ClientFormState } from '@/app/lib/definitions'
import { findUsersByPhone } from '@/app/lib/data'

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Maxim ${max} de caractere`)
    .transform((v) => v || null)

const ClientSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, 'Numele trebuie să aibă cel puțin 2 caractere').max(80),
  // Optional: clients log in with their phone. Empty means no email.
  email: z
    .union([z.literal(''), z.email('Introdu un email valid')])
    .transform((v) => v.trim().toLowerCase() || null),
  // Required: appointment reminders go out by SMS.
  phone: z
    .string()
    .trim()
    .min(1, 'Telefonul este obligatoriu pentru reminderele SMS')
    .regex(/^\+?[0-9 ()-]{6,20}$/, 'Telefon de forma 0712 345 678'),
  birthday: z
    .string()
    .regex(/^$|^\d{4}-\d{2}-\d{2}$/, 'Alege o dată')
    .refine((v) => !v || new Date(v) <= new Date(), 'Data nașterii nu poate fi în viitor')
    .transform((v) => (v ? new Date(`${v}T00:00:00Z`) : null)),
  allergies: optionalText(500),
  privateNotes: optionalText(2000),
  // Unchecked checkboxes are not sent at all, so absence means "no".
  smsMarketingConsent: z.literal('on').optional().transform(Boolean),
  emailMarketingConsent: z.literal('on').optional().transform(Boolean),
  // password is checked separately below; z.object drops it from parsed.data
})

const PasswordSchema = z
  .string()
  .min(8, 'Minim 8 caractere')
  .regex(/[a-zA-Z]/, 'Include o literă')
  .regex(/[0-9]/, 'Include o cifră')

// Creates a client, or updates one when the form includes an id.
export async function saveClient(_prev: ClientFormState, formData: FormData): Promise<ClientFormState> {
  await requireRole('admin') // re-check in every action; never trust the page

  const values = Object.fromEntries(
    [...formData.entries()].filter(([k, v]) => !k.startsWith('$') && typeof v === 'string').map(([k, v]) => [k, String(v)])
  )
  const parsed = ClientSchema.safeParse(values)
  // New clients need a password; on edit it is optional and only resets it.
  const password = values.password ?? ''
  const passwordCheck = !values.id || password ? PasswordSchema.safeParse(password) : null

  const errors = parsed.success ? {} : z.flattenError(parsed.error).fieldErrors
  if (passwordCheck && !passwordCheck.success) {
    Object.assign(errors, { password: passwordCheck.error.issues.map((i) => i.message) })
  }
  // Don't send the password back to the browser.
  const safeValues = { ...values }
  delete safeValues.password
  if (!parsed.success || Object.keys(errors).length) return { errors, values: safeValues }

  const { id, ...data } = parsed.data

  const taken = data.email ? await db.user.findUnique({ where: { email: data.email }, select: { id: true } }) : null
  if (taken && taken.id !== id) {
    return { errors: { email: ['Acest email este deja folosit de alt cont'] }, values: safeValues }
  }
  // Clients can log in with their phone, so it must belong to one account only.
  if ((await findUsersByPhone(data.phone, id)).length > 0) {
    return { errors: { phone: ['Acest telefon este deja folosit de alt cont'] }, values: safeValues }
  }

  const passwordHash = password ? await bcrypt.hash(password, 10) : undefined

  let clientId = id
  if (id) {
    const existing = await db.user.findFirst({
      where: { id, role: 'CLIENT' },
      select: { smsMarketingConsent: true, emailMarketingConsent: true },
    })
    if (!existing) return { message: 'Acest client nu mai există' }
    // GDPR: record when consent changed, as proof.
    const consentChanged =
      existing.smsMarketingConsent !== data.smsMarketingConsent ||
      existing.emailMarketingConsent !== data.emailMarketingConsent
    await db.user.update({
      where: { id },
      data: { ...data, ...(passwordHash && { passwordHash }), ...(consentChanged && { consentUpdatedAt: new Date() }) },
    })
  } else {
    const anyConsent = data.smsMarketingConsent || data.emailMarketingConsent
    const created = await db.user.create({
      data: { ...data, role: 'CLIENT', passwordHash: passwordHash!, ...(anyConsent && { consentUpdatedAt: new Date() }) },
    })
    clientId = created.id
  }

  redirect(`/admin/clients/${clientId}?saved=1`)
}
