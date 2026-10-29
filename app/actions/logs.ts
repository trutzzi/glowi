'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { db } from '@/lib/db'
import { logError } from '@/lib/logger'
import { requireRole } from '@/app/lib/dal'

const ClientError = z.object({
  message: z.string().max(2000),
  stack: z.string().max(8000).optional(),
  path: z.string().max(500).optional(),
})

// Anyone can hit an error screen, so this is callable without a login. A small
// per-IP limit keeps a misbehaving page (or a person) from flooding the log.
const recent = new Map<string, number[]>()
const LIMIT = 20 // reports per IP per minute
const GLOBAL_LIMIT = 200 // reports per minute from everyone together
let globalHits: number[] = []

export async function reportClientError(input: z.input<typeof ClientError>) {
  const parsed = ClientError.safeParse(input)
  if (!parsed.success) return

  const ip = (await headers()).get('x-forwarded-for')?.split(',')[0].trim() || 'local'
  const now = Date.now()
  globalHits = globalHits.filter((t) => now - t < 60_000)
  const hits = (recent.get(ip) ?? []).filter((t) => now - t < 60_000)
  if (hits.length >= LIMIT || globalHits.length >= GLOBAL_LIMIT) return
  recent.set(ip, [...hits, now])
  globalHits.push(now)
  // Forget addresses that went quiet, so the map can't grow without end.
  if (recent.size > 1000) for (const [key, times] of recent) if (times.every((t) => now - t >= 60_000)) recent.delete(key)

  await logError({ source: 'client', ...parsed.data })
}

export async function clearLogs() {
  await requireRole('admin')
  await db.errorLog.deleteMany({})
  redirect('/admin/logs')
}
