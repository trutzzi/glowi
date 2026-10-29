import 'server-only'
import { db } from '@/lib/db'
import { toInternational } from '@/lib/phone'

// Slows down password guessing. Failures are counted per account and per IP
// address in a 15-minute window; past the limit, that key is blocked for 15
// minutes. Kept in the database so a restart or deploy doesn't reset it.
const WINDOW_MS = 15 * 60_000
const BLOCK_MS = 15 * 60_000
const LIMITS = { account: 5, ip: 20 } as const

type Kind = keyof typeof LIMITS

// One key per person however they type their login ("0712 345 678" = "+40712345678").
export function throttleKeys(identifier: string, ip: string) {
  const id = identifier.trim().toLowerCase()
  const account = id.includes('@') ? id : (toInternational(id) ?? id)
  return { account: `account:${account}`.slice(0, 200), ip: `ip:${ip}`.slice(0, 100) }
}

// Minutes until the login may be tried again, or 0 when it is allowed.
export async function blockedMinutes(keys: Record<Kind, string>): Promise<number> {
  const rows = await db.loginThrottle.findMany({ where: { key: { in: Object.values(keys) } } })
  const until = Math.max(0, ...rows.map((r) => r.blockedUntil?.getTime() ?? 0))
  return until > Date.now() ? Math.ceil((until - Date.now()) / 60_000) : 0
}

export async function recordFailure(keys: Record<Kind, string>) {
  const now = new Date()
  for (const kind of Object.keys(LIMITS) as Kind[]) {
    const key = keys[kind]
    const row = await db.loginThrottle.findUnique({ where: { key } })
    const fresh = !row || now.getTime() - row.windowStart.getTime() > WINDOW_MS
    let data = fresh
      ? { failures: 1, windowStart: now, blockedUntil: row?.blockedUntil ?? null }
      : { failures: row.failures + 1, windowStart: row.windowStart, blockedUntil: row.blockedUntil }
    if (data.failures >= LIMITS[kind]) {
      // Block, and start counting again from zero once the block ends.
      data = { failures: 0, windowStart: now, blockedUntil: new Date(now.getTime() + BLOCK_MS) }
    }
    await db.loginThrottle.upsert({ where: { key }, update: data, create: { key, ...data } })
  }
  // Housekeeping: forget keys that have been quiet for a day.
  await db.loginThrottle.deleteMany({ where: { windowStart: { lt: new Date(now.getTime() - 86_400_000) } } })
}

// A successful login clears the account's count (not the IP's: one right
// password must not reset guessing against other accounts from that address).
export async function recordSuccess(keys: Record<Kind, string>) {
  await db.loginThrottle.deleteMany({ where: { key: keys.account } })
}
