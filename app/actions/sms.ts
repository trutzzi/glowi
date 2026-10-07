'use server'

import { requireRole } from '@/app/lib/dal'
import { sendSms } from '@/lib/sms'
import { sendDueMaintenance, sendDueReminders } from '@/lib/reminders'
import { logError } from '@/lib/logger'
import { getSalonInfo } from '@/app/lib/settings'

export type SmsToolState = { ok?: boolean; message?: string }

// Sends one SMS so the admin can check the SMSLink setup.
export async function sendTestSms(_prev: SmsToolState, formData: FormData): Promise<SmsToolState> {
  await requireRole('admin')
  const phone = String(formData.get('phone') ?? '')
  const salon = (await getSalonInfo()).name
  const result = await sendSms(phone, `Test SMS de la ${salon}. Daca ati primit acest mesaj, notificarile functioneaza.`)
  if (!result.ok) {
    await logError({ level: 'warn', source: 'sms', message: `SMS de test către ${phone} eșuat: ${result.error}` })
    return { ok: false, message: result.error }
  }
  return {
    ok: true,
    message: result.test
      ? 'Acceptat în modul test (SMSLINK_TEST=1): nu s-a livrat nimic.'
      : `Trimis. ID mesaj SMSLink: ${result.messageId ?? 'necunoscut'}.`,
  }
}

// Runs the same job as /api/cron/reminders, on demand.
export async function runRemindersNow(): Promise<SmsToolState> {
  await requireRole('admin')
  const now = new Date()
  const [run, maintenance] = [await sendDueReminders(now, { manual: true }), await sendDueMaintenance(now, { manual: true })]
  const mode = run.test ? ' (mod test, nu s-a livrat nimic)' : ''
  const parts = [
    run.due ? `${run.sent} din ${run.due} remindere pentru mâine` : 'niciun reminder pentru mâine',
    maintenance.due ? `${maintenance.sent} SMS de întreținere` + (maintenance.skippedBooked ? ` (${maintenance.skippedBooked} săriți: au deja programare)` : '') : 'nicio întreținere scadentă',
  ]
  const failed = run.failed.length + maintenance.failed
  return {
    ok: failed === 0,
    message: `Trimis: ${parts.join('; ')}${mode}.` + (failed ? ` ${failed} eșuate, vezi jurnalul de erori.` : ''),
  }
}
