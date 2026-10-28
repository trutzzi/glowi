import 'server-only'
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import type { SessionPayload } from '@/app/lib/definitions'
import type { Role } from '@/lib/auth'
import { isSessionCurrent } from '@/app/lib/data'

const COOKIE_NAME = 'session'
// Clients stay signed in for a week; the admin, who sees every client's data, for a working day.
const SESSION_HOURS: Record<Role, number> = { client: 7 * 24, admin: 12 }

// Read when first needed (not at import: the image build has no secrets).
// A missing or short secret would make the login tokens forgeable.
function signingKey() {
  const secret = process.env.SESSION_SECRET ?? ''
  if (secret.length < 32) throw new Error('SESSION_SECRET is missing or shorter than 32 characters')
  return new TextEncoder().encode(secret)
}

const cookieOptions = (expires: Date) => ({
  httpOnly: true,
  // Safari rejects Secure cookies on http://localhost, so only require it in production.
  secure: process.env.NODE_ENV === 'production',
  expires,
  sameSite: 'lax' as const,
  path: '/',
})

export async function encrypt(payload: SessionPayload) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(payload.expiresAt)
    .sign(signingKey())
}

export async function decrypt(session: string | undefined = '') {
  try {
    const { payload } = await jwtVerify(session, signingKey(), { algorithms: ['HS256'] })
    return payload
  } catch {
    return undefined
  }
}

export async function createSession(userId: string, role: Role, sessionVersion = 0) {
  const expiresAt = new Date(Date.now() + SESSION_HOURS[role] * 60 * 60 * 1000)
  const session = await encrypt({ userId, role, sv: sessionVersion, expiresAt })
  ;(await cookies()).set(COOKIE_NAME, session, cookieOptions(expiresAt))
}

// Used by getCurrentUser() in app/actions/auth.ts
export async function getSession(): Promise<{ userId?: string }> {
  const payload = await decrypt((await cookies()).get(COOKIE_NAME)?.value)
  return { userId: (await isSessionCurrent(payload)) ? (payload!.userId as string) : undefined }
}

export async function deleteSession() {
  ;(await cookies()).delete(COOKIE_NAME)
}
