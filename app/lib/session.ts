import 'server-only'
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import type { SessionPayload } from '@/app/lib/definitions'
import type { Role } from '@/lib/auth'

const COOKIE_NAME = 'session'
const SESSION_DAYS = 7
const encodedKey = new TextEncoder().encode(process.env.SESSION_SECRET)

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
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(encodedKey)
}

export async function decrypt(session: string | undefined = '') {
  try {
    const { payload } = await jwtVerify(session, encodedKey, { algorithms: ['HS256'] })
    return payload
  } catch {
    return undefined
  }
}

export async function createSession(userId: string, role: Role) {
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000)
  const session = await encrypt({ userId, role, expiresAt })
  ;(await cookies()).set(COOKIE_NAME, session, cookieOptions(expiresAt))
}

// Used by getCurrentUser() in app/actions/auth.ts
export async function getSession(): Promise<{ userId?: string }> {
  const payload = await decrypt((await cookies()).get(COOKIE_NAME)?.value)
  return { userId: payload?.userId as string | undefined }
}

export async function deleteSession() {
  ;(await cookies()).delete(COOKIE_NAME)
}
