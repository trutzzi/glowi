import { timingSafeEqual } from 'node:crypto'
import { sendDueMaintenance, sendDueReminders } from '@/lib/reminders'

// Called every hour by a scheduler (Vercel Cron, crontab, ...) with
//   Authorization: Bearer <CRON_SECRET>
// Sends tomorrow's appointment reminders and due maintenance reminders;
// does nothing before 10:00 or after 21:00 (salon time).
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) return new Response('CRON_SECRET is not set', { status: 500 })

  const given = Buffer.from(request.headers.get('authorization') ?? '')
  const expected = Buffer.from(`Bearer ${secret}`)
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return new Response('Unauthorized', { status: 401 })
  }

  const now = new Date()
  return Response.json({ reminders: await sendDueReminders(now), maintenance: await sendDueMaintenance(now) })
}
