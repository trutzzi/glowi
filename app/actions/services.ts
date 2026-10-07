'use server'

import { redirect } from 'next/navigation'
import { updateTag } from 'next/cache'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireRole } from '@/app/lib/dal'
import { SERVICES_TAG } from '@/app/lib/services'
import type { ServiceFormState } from '@/app/lib/definitions'

// Uploaded service pictures. Keep under serverActions.bodySizeLimit in next.config.ts.
const MAX_IMAGE_BYTES = 4 * 1024 * 1024
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

const ServiceSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(2, 'Denumirea trebuie să aibă cel puțin 2 caractere').max(80),
  description: z.string().trim().min(2, 'Adaugă o scurtă descriere').max(200),
  categoryId: z.string().optional(),
  newCategory: z.string().trim().max(40).optional(),
  price: z
    .string()
    .trim()
    .regex(/^\d{1,6}(\.\d{1,2})?$/, 'Preț de forma 120 sau 120.50'),
  durationMin: z.coerce.number().int('Minute întregi').min(5, 'Minim 5 minute').max(600, 'Maxim 600 de minute'),
  bufferMin: z.coerce.number().int('Minute întregi').min(0, 'Nu poate fi negativă').max(120, 'Maxim 120 de minute'),
  // Empty = this service has no maintenance.
  maintenanceWeeks: z
    .string()
    .trim()
    .regex(/^$|^\d{1,2}$/, 'Număr de săptămâni, ex. 3')
    .transform((v) => (v ? Number(v) : null))
    .refine((v) => v === null || (v >= 1 && v <= 52), 'Între 1 și 52 de săptămâni'),
})

const slugify = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // ă → a, ș → s
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'service'

async function uniqueSlug(title: string) {
  const base = slugify(title)
  for (let n = 1; ; n++) {
    const slug = n === 1 ? base : `${base}-${n}`
    if (!(await db.service.findUnique({ where: { slug }, select: { id: true } }))) return slug
  }
}

// Creates a service, or updates one when the form includes an id.
export async function saveService(_prev: ServiceFormState, formData: FormData): Promise<ServiceFormState> {
  await requireRole('admin') // re-check in every action; never trust the page

  // Text fields only; the picture is a File and is checked separately below.
  const values = Object.fromEntries(
    [...formData.entries()].filter(([k, v]) => !k.startsWith('$') && typeof v === 'string').map(([k, v]) => [k, String(v)])
  )
  const parsed = ServiceSchema.safeParse(values)
  const file = formData.get('image')
  const upload = file instanceof File && file.size > 0 ? file : null
  const imageError = !upload
    ? undefined
    : !IMAGE_TYPES.includes(upload.type)
      ? 'Folosește o imagine JPG, PNG sau WebP'
      : upload.size > MAX_IMAGE_BYTES
        ? 'Imaginea trebuie să aibă cel mult 4 MB'
        : undefined

  if (!parsed.success || imageError) {
    const errors = parsed.success ? {} : z.flattenError(parsed.error).fieldErrors
    return { errors: imageError ? { ...errors, image: [imageError] } : errors, values }
  }
  const { id, newCategory, categoryId, ...data } = parsed.data

  // A typed new category wins over the dropdown.
  let category: string | null = categoryId || null
  if (newCategory) {
    const created = await db.category.upsert({ where: { name: newCategory }, update: {}, create: { name: newCategory } })
    category = created.id
  }

  // The slug stays the same on edit so existing links keep working.
  const service = id
    ? await db.service.update({ where: { id }, data: { ...data, categoryId: category } })
    : await db.service.create({ data: { ...data, categoryId: category, slug: await uniqueSlug(data.title) } })

  if (upload) {
    const image = { data: new Uint8Array(await upload.arrayBuffer()), mimeType: upload.type }
    await db.serviceImage.upsert({ where: { serviceId: service.id }, update: image, create: { serviceId: service.id, ...image } })
  } else if (values.removeImage === 'on') {
    await db.serviceImage.deleteMany({ where: { serviceId: service.id } })
  }

  updateTag(SERVICES_TAG)
  redirect('/admin/services')
}

// Hide or show a service. Hidden services stay in the database so past
// appointments keep their service.
export async function setServiceActive(id: string, active: boolean) {
  await requireRole('admin')
  await db.service.update({ where: { id }, data: { active } })
  updateTag(SERVICES_TAG)
}
