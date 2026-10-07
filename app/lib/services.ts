import 'server-only'
import { cacheLife, cacheTag } from 'next/cache'
import { db } from '@/lib/db'
import { requireRole } from '@/app/lib/dal'
import type { CategoryView, CategoryWithCount, ServiceView } from '@/app/lib/definitions'

// Cache tag shared by every services read; the service actions call
// updateTag(SERVICES_TAG) after a change so all screens refresh.
export const SERVICES_TAG = 'services'

// Only the image's timestamp, never its bytes.
const include = { category: true, image: { select: { updatedAt: true } } } as const

type ServiceRow = Awaited<ReturnType<typeof db.service.findMany<{ include: typeof include }>>>[number]

function toView(s: ServiceRow): ServiceView {
  return {
    id: s.id,
    slug: s.slug,
    title: s.title,
    description: s.description,
    // The timestamp in the path changes on every upload, so browsers never show a stale picture.
    imageUrl: s.image ? `/service-images/${s.id}/${s.image.updatedAt.getTime()}` : null,
    categoryId: s.categoryId,
    categoryName: s.category?.name ?? null,
    durationMin: s.durationMin,
    bufferMin: s.bufferMin,
    maintenanceWeeks: s.maintenanceWeeks,
    price: s.price.toFixed(2),
    active: s.active,
  }
}

const orderBy = [{ category: { sortOrder: 'asc' as const } }, { category: { name: 'asc' as const } }, { title: 'asc' as const }]

// Services are the same for every visitor, so they are cached on the server
// (plain 'use cache') rather than per user. Callers check the session first.
export async function getActiveServices(): Promise<ServiceView[]> {
  'use cache'
  cacheTag(SERVICES_TAG)
  cacheLife('hours')
  const rows = await db.service.findMany({ where: { active: true }, include, orderBy })
  return rows.map(toView)
}

// Admin reads check the role here, next to the data, not only in the page.
export async function getAllServices(): Promise<ServiceView[]> {
  await requireRole('admin')
  return allServices()
}

async function allServices(): Promise<ServiceView[]> {
  'use cache'
  cacheTag(SERVICES_TAG)
  cacheLife('hours')
  const rows = await db.service.findMany({ include, orderBy })
  return rows.map(toView)
}

export async function getServiceById(id: string): Promise<ServiceView | null> {
  await requireRole('admin')
  const row = await db.service.findUnique({ where: { id }, include })
  return row ? toView(row) : null
}

export async function getCategories(): Promise<CategoryView[]> {
  await requireRole('admin')
  return db.category.findMany({
    select: { id: true, name: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  })
}

export async function getCategoriesWithCounts(): Promise<CategoryWithCount[]> {
  await requireRole('admin')
  const rows = await db.category.findMany({
    select: { id: true, name: true, _count: { select: { services: true } } },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  })
  return rows.map((c) => ({ id: c.id, name: c.name, serviceCount: c._count.services }))
}
