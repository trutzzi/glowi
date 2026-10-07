import 'server-only'
import { db } from '@/lib/db'

// Persistent error log, shown to the admin at /admin/logs.
export type LogEntry = {
  level?: 'error' | 'warn'
  source: 'server' | 'client' | 'sms'
  message: string
  digest?: string | null
  path?: string | null
  method?: string | null
  routeType?: string | null
  stack?: string | null
}

const RETENTION_DAYS = 30
const cut = (text: string | null | undefined, max: number) => (text ? text.slice(0, max) : null)

// Never throws: a failure to log must not break the request that is failing.
export async function logError(entry: LogEntry) {
  try {
    await db.errorLog.create({
      data: {
        level: entry.level ?? 'error',
        source: entry.source,
        message: cut(entry.message, 2000) || '(fără mesaj)',
        digest: cut(entry.digest, 100),
        path: cut(entry.path, 500),
        method: cut(entry.method, 10),
        routeType: cut(entry.routeType, 20),
        stack: cut(entry.stack, 8000),
      },
    })
    await db.errorLog.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - RETENTION_DAYS * 86_400_000) } } })
  } catch (error) {
    console.error('Could not write to ErrorLog:', error, entry)
  }
}
