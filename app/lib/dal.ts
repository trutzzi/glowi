import 'server-only'

import { cache } from 'react'
import { cookies } from 'next/headers'
import { connection } from 'next/server'
import { redirect } from 'next/navigation'
import { decrypt } from '@/app/lib/session'
import type { Role } from '@/lib/auth'

export const verifySession = cache(async () => {
    const cookie = (await cookies()).get('session')?.value
    // Checking the token's expiry reads the clock (jose); connection() keeps that
    // out of prerendering, where Next.js rejects time reads ("unstable new Date()").
    await connection()
    const session = await decrypt(cookie)

    if (!session?.userId) {
        redirect('/login')
    }

    return { isAuth: true, userId: session.userId, role: session.role as string | undefined }
})

// Authorization: not just "logged in?" but "allowed to be here?".
// The role comes from the signed session cookie, so the client cannot fake it.
export async function requireRole(role: Role) {
    const session = await verifySession()
    if (session.role !== role) {
        redirect('/home')
    }
    return session
}
