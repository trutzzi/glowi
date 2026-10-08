'use server'

import { redirect } from 'next/navigation'
import { createSession } from '@/app/lib/session'
import { DEMO_USER_ID, demoEnabled } from '@/app/lib/demo'

// "Încearcă contul demo" on /login: signs the visitor in as the demo client.
export async function startDemo() {
  if (!demoEnabled()) redirect('/login')
  await createSession(DEMO_USER_ID, 'client')
  redirect('/home')
}
