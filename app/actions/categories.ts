'use server'

import { updateTag } from 'next/cache'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireRole } from '@/app/lib/dal'
import { SERVICES_TAG } from '@/app/lib/services'
import type { CategoryFormState } from '@/app/lib/definitions'

const Name = z.string().trim().min(2, 'Numele trebuie să aibă cel puțin 2 caractere').max(40, 'Maxim 40 de caractere')

// Category names and order appear wherever services are listed.
const refresh = () => updateTag(SERVICES_TAG)

async function nameTaken(name: string, exceptId?: string) {
  const found = await db.category.findFirst({
    where: { name: { equals: name, mode: 'insensitive' }, ...(exceptId && { id: { not: exceptId } }) },
    select: { id: true },
  })
  return Boolean(found)
}

export async function createCategory(_prev: CategoryFormState, formData: FormData): Promise<CategoryFormState> {
  await requireRole('admin')
  const parsed = Name.safeParse(formData.get('name'))
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  if (await nameTaken(parsed.data)) return { error: 'Există deja o categorie cu acest nume' }

  const last = await db.category.aggregate({ _max: { sortOrder: true } })
  await db.category.create({ data: { name: parsed.data, sortOrder: (last._max.sortOrder ?? 0) + 1 } })
  refresh()
  return { ok: true }
}

export async function renameCategory(id: string, _prev: CategoryFormState, formData: FormData): Promise<CategoryFormState> {
  await requireRole('admin')
  const parsed = Name.safeParse(formData.get('name'))
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  if (await nameTaken(parsed.data, id)) return { error: 'Există deja o categorie cu acest nume' }

  await db.category.update({ where: { id }, data: { name: parsed.data } })
  refresh()
  return { ok: true }
}

// Moves a category one place up or down, then renumbers all of them 1..n so
// the order stays clean even if two had the same sortOrder.
export async function moveCategory(id: string, direction: 'up' | 'down') {
  await requireRole('admin')
  const all = await db.category.findMany({ select: { id: true }, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] })
  const from = all.findIndex((c) => c.id === id)
  const to = direction === 'up' ? from - 1 : from + 1
  if (from < 0 || to < 0 || to >= all.length) return

  ;[all[from], all[to]] = [all[to], all[from]]
  await db.$transaction(all.map((c, i) => db.category.update({ where: { id: c.id }, data: { sortOrder: i + 1 } })))
  refresh()
}

// Services in a deleted category are kept and become "Fără categorie"
// (the relation is onDelete: SetNull).
export async function deleteCategory(id: string) {
  await requireRole('admin')
  await db.category.deleteMany({ where: { id } })
  refresh()
}
