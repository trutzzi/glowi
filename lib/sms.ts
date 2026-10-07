import 'server-only'

// SMSLink SMS Gateway (HTTP). Docs: https://www.smslink.ro/sms-gateway-documentatie-sms-gateway.html
// SMS_REDIRECT_TO (optional): send every SMS to this number instead, for testing
// with made-up client numbers. The text is prefixed with the intended recipient.
// Credentials come from .env: SMSLINK_CONNECTION_ID, SMSLINK_PASSWORD, optional
// SMSLINK_SENDER (must be activated by SMSLink) and SMSLINK_TEST=1 to simulate
// sending without delivery or cost.
import { normalizeRoMobile } from '@/lib/phone'

const ENDPOINT = 'https://secure.smslink.ro/sms/gateway/communicate/index.php'

export type SmsResult = { ok: true; messageId: string | null; test: boolean } | { ok: false; error: string }

// Keeps text in the basic GSM-7 alphabet so one SMS holds 160 characters.
// A single ă/ș/ț would switch the message to Unicode (70 characters per SMS).
export function toGsmText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // ă -> a, ș -> s, ţ -> t
    .replace(/[„“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/[^A-Za-z0-9 \n@£$¥!"#%&'()*+,\-./:;<=>?¡¿]/g, '')
}

// The number every SMS is redirected to while SMS_REDIRECT_TO is set, else null.
export function smsRedirectTarget(): string | null {
  const target = process.env.SMS_REDIRECT_TO
  return target ? normalizeRoMobile(target) : null
}

export async function sendSms(phone: string, text: string): Promise<SmsResult> {
  const connectionId = process.env.SMSLINK_CONNECTION_ID
  const password = process.env.SMSLINK_PASSWORD
  if (!connectionId || !password) return { ok: false, error: 'SMSLINK_CONNECTION_ID / SMSLINK_PASSWORD lipsesc din .env' }

  const recipient = normalizeRoMobile(phone)
  if (!recipient) return { ok: false, error: `Nu este un număr de mobil românesc: ${phone}` }

  // Test mode: deliver to the tester's phone, showing who it was meant for.
  const redirect = smsRedirectTarget()
  const to = redirect ?? recipient
  const message = redirect ? `[${recipient.replace('+40', '0')}] ${text}` : text

  const test = process.env.SMSLINK_TEST === '1'
  const body = new URLSearchParams({
    connection_id: connectionId,
    password,
    to,
    message: toGsmText(message),
    ...(process.env.SMSLINK_SENDER && { sender: process.env.SMSLINK_SENDER }),
    ...(test && { test: '1' }),
  })

  // POST, not GET: their GET example puts the password in the URL, which ends up in logs.
  let response: Response
  try {
    response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(15_000),
    })
  } catch (error) {
    return { ok: false, error: `SMSLink nu poate fi contactat: ${String(error)}` }
  }

  // Plain text: "MESSAGE;<code>;<description>;<variables>" or "ERROR;<code>;<description>".
  const reply = (await response.text()).trim()
  const [kind, code, description = '', variables = ''] = reply.split(';')
  if (kind === 'MESSAGE') return { ok: true, messageId: variables.split(',')[0] || null, test }
  return { ok: false, error: kind === 'ERROR' ? `Eroare SMSLink ${code}: ${description}` : `Răspuns neașteptat (HTTP ${response.status}): ${reply.slice(0, 200)}` }
}
