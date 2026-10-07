import 'server-only'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import type { Role } from '@/lib/auth'
import { toInternational } from '@/lib/phone'

export type UserRecord = {
  id: string
  name: string
  email: string | null
  role: Role
}

// The database stores roles as CLIENT/ADMIN; the app uses 'client'/'admin'.
const toRole = (role: string) => role.toLowerCase() as Role

export async function findUserById(id: string): Promise<UserRecord | null> {
  const user = await db.user.findUnique({ where: { id } })
  if (!user) return null
  return { id: user.id, name: user.name, email: user.email, role: toRole(user.role) }
}

// Users with this phone number, in any written form ("0712 345 678", "+40712345678", ...).
// Phones are stored as typed, so they are compared after normalising.
export async function findUsersByPhone(phone: string, exceptId?: string) {
  const wanted = toInternational(phone)
  if (!wanted) return []
  const candidates = await db.user.findMany({
    where: { phone: { not: null }, ...(exceptId && { id: { not: exceptId } }) },
    select: { id: true, phone: true },
  })
  return candidates.filter((u) => toInternational(u.phone!) === wanted)
}

// `identifier` is an email, or a phone number for clients who log in with it.
export async function verifyCredentials(
  identifier: string,
  password: string,
  role: Role
): Promise<UserRecord | null> {
  const id = identifier.trim()
  let user
  if (id.includes('@')) {
    user = await db.user.findUnique({ where: { email: id.toLowerCase() } })
  } else {
    // A number shared by two accounts can't identify anyone, so it is refused.
    const matches = await findUsersByPhone(id)
    user = matches.length === 1 ? await db.user.findUnique({ where: { id: matches[0].id } }) : null
  }
  if (!user || toRole(user.role) !== role) return null
  if (!(await bcrypt.compare(password, user.passwordHash))) return null

  return { id: user.id, name: user.name, email: user.email, role }
}
