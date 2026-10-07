import 'server-only'
import { redirect } from 'next/navigation'
import { cacheTag } from 'next/cache'
import { deleteSession, getSession } from '@/app/lib/session'
import { findUserById } from '@/app/lib/data'

export async function logout() {
    await deleteSession()
    redirect('/login')
}


export type User = {
    id: string
    name: string
}

export const CURRENT_USER_TAG = 'current-user'

export async function getCurrentUser(): Promise<User> {
    'use cache: private'
    // Lets invalidateCurrentUser() (app/actions/session.ts) drop this cached result
    cacheTag(CURRENT_USER_TAG)

    const { userId } = await getSession()
    if (!userId) {
        redirect('/login')
    }

    const user = await findUserById(userId)
    if (!user) {
        redirect('/login')
    }

    return { id: user.id, name: user.name }
}