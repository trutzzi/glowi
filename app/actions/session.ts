'use server'

import { updateTag } from 'next/cache'
import { CURRENT_USER_TAG } from '@/app/actions/auth'

// Call after login/logout: the session cookie is set in a Route Handler, which
// does not clear the browser's cached getCurrentUser() result on its own.
export async function invalidateCurrentUser() {
  updateTag(CURRENT_USER_TAG)
}
