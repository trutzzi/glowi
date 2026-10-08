import 'server-only'
import { getActiveServices } from '@/app/lib/services'
import { salonToUtc, utcToSalon } from '@/lib/time'
import { addDays } from '@/lib/dates'
import type { UserRecord } from '@/app/lib/data'
import type { MaintenanceView, MyAppointmentView, MyProfile, RequestStatusKey, RequestView } from '@/app/lib/definitions'

// The public demo client (faint "demo" link at the bottom of /login), for visitors who
// want to see the app. It has no database row: its session carries this id and
// the client data functions return the sample data below, built around today
// from the salon's real services. So it never takes a real time slot, never
// shows up for the admin, has no phone (no SMS) and can't change anything.
// Turn it off with DEMO_ACCOUNT=0.
export const DEMO_USER_ID = 'demo'
export const DEMO_READ_ONLY = 'Acțiune dezactivată în contul demo. Aici nu se salvează nimic.'

export const demoEnabled = () => process.env.DEMO_ACCOUNT !== '0'
export const isDemo = (userId: unknown) => userId === DEMO_USER_ID && demoEnabled()

export const demoUser: UserRecord = { id: DEMO_USER_ID, name: 'Maria Demo', email: null, role: 'client' }

// [id, days from today, salon time, status]; the first two are upcoming.
const VISITS = [
  ['demo-1', 2, '14:00', 'SCHEDULED'],
  ['demo-2', 16, '11:00', 'SCHEDULED'],
  ['demo-3', -12, '10:30', 'HONORED'],
  ['demo-4', -41, '16:00', 'HONORED'],
  ['demo-5', -63, '12:00', 'MISSED_ANNOUNCED'],
  ['demo-6', -90, '09:30', 'HONORED'],
] as const

const today = () => utcToSalon(new Date()).date

// Prefer services with a photo, so the cards look like the real thing.
async function demoServices() {
  const services = await getActiveServices()
  return [...services].sort((a, b) => Number(Boolean(b.imageUrl)) - Number(Boolean(a.imageUrl)))
}

export async function demoAppointments(): Promise<MyAppointmentView[]> {
  const services = await demoServices()
  if (!services.length) return []
  return VISITS.map(([id, days, time, status], i) => {
    const s = services[i % services.length]
    const start = salonToUtc(addDays(today(), days), time)
    return {
      id,
      clientId: DEMO_USER_ID,
      clientName: demoUser.name,
      serviceId: s.id,
      serviceTitle: s.title,
      serviceImageUrl: s.imageUrl,
      start: start.toISOString(),
      end: new Date(start.getTime() + (s.durationMin + s.bufferMin) * 60_000).toISOString(),
      price: s.price,
      status,
    }
  }).sort((a, b) => b.start.localeCompare(a.start)) // newest first, like getMyAppointments
}

// The second upcoming visit has an approved reschedule, so visitors can open the calendar.
export function demoRequests(): Map<string, { id: string; type: RequestView['type']; status: RequestStatusKey; adminNote: string | null }> {
  return new Map([['demo-2', { id: 'demo-r', type: 'RESCHEDULE', status: 'APPROVED', adminNote: null }]])
}

export async function demoApprovedReschedule(appointmentId: string) {
  if (appointmentId !== 'demo-2') return null
  const appt = (await demoAppointments()).find((a) => a.id === appointmentId)
  if (!appt) return null
  return {
    id: 'demo-r',
    appointment: {
      id: appt.id,
      status: appt.status,
      serviceId: appt.serviceId,
      appointmentDate: new Date(appt.start),
      service: { id: appt.serviceId, title: appt.serviceTitle },
    },
  }
}

export async function demoMaintenance(): Promise<MaintenanceView[]> {
  const honored = (await demoAppointments()).find((a) => a.status === 'HONORED')
  if (!honored) return []
  const weeks = 4
  const lastVisit = utcToSalon(new Date(honored.start)).date
  return [
    {
      id: 'demo-m',
      clientId: DEMO_USER_ID,
      clientName: demoUser.name,
      clientPhone: null,
      serviceId: honored.serviceId,
      serviceTitle: honored.serviceTitle,
      intervalWeeks: weeks,
      lastVisitAt: honored.start,
      dueDate: addDays(lastVisit, weeks * 7),
      smsSentAt: null,
      state: 'upcoming',
    },
  ]
}

export async function demoProfile(): Promise<MyProfile> {
  const visits = await demoAppointments()
  return {
    id: DEMO_USER_ID,
    role: 'client',
    name: demoUser.name,
    email: 'demo@exemplu.ro',
    phone: null,
    birthday: '1992-04-18',
    allergies: 'Latex',
    smsMarketingConsent: true,
    emailMarketingConsent: false,
    consentUpdatedAt: null,
    memberSince: salonToUtc(addDays(today(), -120), '10:00').toISOString(),
    honoredVisits: visits.filter((a) => a.status === 'HONORED').length,
  }
}
