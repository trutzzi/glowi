'use server'

import { updateTag } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireRole } from '@/app/lib/dal'
import { ANNOUNCEMENT_TAG, SALON_TAG } from '@/app/lib/settings'
import { toInternational } from '@/lib/phone'
import type { AnnouncementFormState, OpeningHours, ProfileFormState } from '@/app/lib/definitions'

const AnnouncementSchema = z
  .object({
    enabled: z.literal('on').optional().transform(Boolean),
    title: z.string().trim().max(60, 'Maxim 60 de caractere'),
    body: z.string().trim().max(400, 'Maxim 400 de caractere'),
  })
  .refine((a) => !a.enabled || a.title || a.body, { message: 'Scrie un titlu sau un mesaj', path: ['title'] })

export async function saveAnnouncement(_prev: AnnouncementFormState, formData: FormData): Promise<AnnouncementFormState> {
  await requireRole('admin')
  const parsed = AnnouncementSchema.safeParse({
    enabled: formData.get('enabled') ?? undefined,
    title: formData.get('title') ?? '',
    body: formData.get('body') ?? '',
  })
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors }

  await db.setting.upsert({
    where: { key: 'clientAnnouncement' },
    update: { value: parsed.data },
    create: { key: 'clientAnnouncement', value: parsed.data },
  })
  updateTag(ANNOUNCEMENT_TAG)
  return { ok: true }
}

export async function setAdminGuideHidden(hidden: boolean) {
  await requireRole('admin')
  await db.setting.upsert({
    where: { key: 'adminGuideHidden' },
    update: { value: hidden },
    create: { key: 'adminGuideHidden', value: hidden },
  })
  redirect('/admin')
}

const SalonSchema = z.object({
  name: z.string().trim().min(2, 'Numele trebuie să aibă cel puțin 2 caractere').max(40, 'Maxim 40 de caractere'),
  phone: z
    .string()
    .trim()
    .refine((v) => !v || toInternational(v), 'Telefon de forma 0712 345 678')
    .transform((v) => v || null),
})

export async function saveSalonInfo(_prev: ProfileFormState, formData: FormData): Promise<ProfileFormState> {
  await requireRole('admin')
  const parsed = SalonSchema.safeParse({ name: formData.get('name') ?? '', phone: formData.get('phone') ?? '' })
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors }

  await db.setting.upsert({
    where: { key: 'salon' },
    update: { value: parsed.data },
    create: { key: 'salon', value: parsed.data },
  })
  updateTag(SALON_TAG)
  return { ok: true, message: 'Salvat. Numele apare în aplicație, SMS și WhatsApp.' }
}

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/

// Weekly opening hours used for the clients' calendar. Fields per weekday d (0–6):
// closed_d ("on" = closed), open_d, close_d.
export async function saveOpeningHours(_prev: ProfileFormState, formData: FormData): Promise<ProfileFormState> {
  await requireRole('admin')
  const hours = {} as OpeningHours
  const errors: Record<string, string[]> = {}
  for (const d of ['0', '1', '2', '3', '4', '5', '6'] as const) {
    if (formData.get(`closed_${d}`) === 'on') {
      hours[d] = null
      continue
    }
    const open = String(formData.get(`open_${d}`) ?? '')
    const close = String(formData.get(`close_${d}`) ?? '')
    if (!HHMM.test(open) || !HHMM.test(close) || close <= open) {
      errors[d] = ['Ora de închidere trebuie să fie după cea de deschidere']
      continue
    }
    hours[d] = { open, close }
  }
  if (Object.keys(errors).length) return { errors }

  await db.setting.upsert({ where: { key: 'openingHours' }, update: { value: hours }, create: { key: 'openingHours', value: hours } })
  updateTag(SALON_TAG)
  return { ok: true, message: 'Programul a fost salvat.' }
}
