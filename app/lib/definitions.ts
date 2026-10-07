import type { Role } from '@/lib/auth'

export type SessionPayload = {
  userId: string
  role?: Role
  expiresAt: Date
}

// A service as the UI sees it. Plain values only (price is a string, not a
// Prisma Decimal) so it can be passed to Client Components.
export type ServiceView = {
  id: string
  slug: string
  title: string
  description: string
  imageUrl: string | null // null until the admin uploads a picture
  categoryId: string | null
  categoryName: string | null
  durationMin: number
  bufferMin: number
  maintenanceWeeks: number | null // null = no maintenance for this service
  price: string // "45.00", RON
  active: boolean
}

export type CategoryView = { id: string; name: string }

// What a service form action returns to useActionState.
export type ServiceFormState = {
  errors?: Partial<Record<string, string[]>>
  message?: string
  values?: Record<string, string> // what was submitted, so the form keeps it after an error
}

// A client row in the admin list.
export type ClientListItem = {
  id: string
  name: string
  email: string | null // optional: clients log in with their phone
  phone: string | null
}

// Everything the admin can see and edit about a client. Admin-only: it
// includes privateNotes, so never pass it to a client-facing screen.
export type ClientView = ClientListItem & {
  birthday: string | null // "YYYY-MM-DD"
  allergies: string | null
  privateNotes: string | null
  smsMarketingConsent: boolean
  emailMarketingConsent: boolean
  consentUpdatedAt: string | null // ISO timestamp
}

export type ClientFormState = {
  errors?: Partial<Record<string, string[]>>
  message?: string
  values?: Record<string, string>
}

export const APPOINTMENT_STATUSES = [
  'SCHEDULED',
  'HONORED',
  'MISSED_ANNOUNCED',
  'MISSED_SHORT_NOTICE',
  'NOT_HONORED',
] as const
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number]

export const STATUS_LABELS: Record<AppointmentStatus, string> = {
  SCHEDULED: 'Programată',
  HONORED: 'Onorată',
  MISSED_ANNOUNCED: 'Anulată la timp',
  MISSED_SHORT_NOTICE: 'Anulată târziu',
  NOT_HONORED: 'Neonorată',
}

// An appointment as the admin sees it. Dates are ISO strings so the object can
// be passed to Client Components.
export type AppointmentView = {
  id: string
  clientId: string
  clientName: string
  clientPhone: string | null
  serviceId: string
  serviceTitle: string
  serviceImageUrl: string | null
  start: string // ISO, UTC
  end: string // ISO, UTC; includes the buffer
  price: string // "45.00", agreed at booking
  status: AppointmentStatus
  lateMinutes: number | null // admin-only; set when HONORED but late
  notes: string | null // admin-only
  reminderSentAt: string | null
}

// What a client may see about their own appointment: no admin notes.
export type MyAppointmentView = Omit<AppointmentView, 'notes' | 'clientPhone' | 'reminderSentAt' | 'lateMinutes'>

// Choices in the "Întârziat" popup.
export const LATE_MINUTES = [5, 10, 15, 30] as const

// Options for the booking form.
export type BookingOptions = {
  clients: { id: string; name: string; phone: string | null }[]
  services: { id: string; title: string; durationMin: number; bufferMin: number; price: string }[]
}

export type AppointmentFormState = {
  errors?: Partial<Record<string, string[]>>
  message?: string
  values?: Record<string, string>
  conflictId?: string // the appointment a refused booking overlaps, so the form can link to it
}

export type CategoryWithCount = CategoryView & { serviceCount: number }

export type CategoryFormState = { error?: string; ok?: boolean }

// One entry in a client's history (admin only: includes notes and delays).
export type ClientHistoryItem = {
  id: string
  serviceTitle: string
  start: string // ISO
  end: string // ISO
  price: string
  status: AppointmentStatus
  lateMinutes: number | null
  notes: string | null
}

export type ClientStats = {
  honored: number
  lateArrivals: number // honored, but late
  noShows: number
  cancelledLate: number
  cancelledInTime: number
  totalSpent: string // sum of honored visits, "1234.00"
  lastVisit: string | null // ISO of the latest honored visit
}

// Message the admin shows on every client's home screen.
export type Announcement = { enabled: boolean; title: string; body: string }

export type AnnouncementFormState = { errors?: Partial<Record<string, string[]>>; ok?: boolean }

// What the admin has set up so far; drives the checkmarks in the quick guide.
export type SetupProgress = {
  services: number
  clients: number
  appointments: number
  attendanceRecorded: number
  smsLive: boolean // credentials set and SMSLINK_TEST is off
  announcement: boolean
}

// What a logged-in user sees about themselves. Never includes privateNotes or the password hash.
export type MyProfile = {
  id: string
  role: 'client' | 'admin'
  name: string
  email: string | null
  phone: string | null
  birthday: string | null // "YYYY-MM-DD"
  allergies: string | null
  smsMarketingConsent: boolean
  emailMarketingConsent: boolean
  consentUpdatedAt: string | null
  memberSince: string // ISO
  honoredVisits: number
}

export type ProfileFormState = { errors?: Partial<Record<string, string[]>>; ok?: boolean; message?: string }

// Salon details edited by the admin in Profil; shown across the app, in SMS and WhatsApp.
export type SalonInfo = { name: string; phone: string | null }

// Where a client's maintenance stands, for badges and grouping.
export type MaintenanceState =
  | 'declined' // the client turned it off; nothing is sent
  | 'stopped' // the admin turned it off
  | 'booked' // the client already has a future appointment for this service
  | 'sent' // this cycle's SMS went out
  | 'due' // due today or overdue, SMS not sent yet
  | 'upcoming' // due later

export type MaintenanceView = {
  id: string
  clientId: string
  clientName: string
  clientPhone: string | null
  serviceId: string
  serviceTitle: string
  intervalWeeks: number
  lastVisitAt: string // ISO
  dueDate: string // "YYYY-MM-DD", salon day
  smsSentAt: string | null
  state: MaintenanceState
}

// Shown in the "Întreținere?" popup when a visit is marked Onorată.
export type MaintenanceOffer = {
  serviceTitle: string
  defaultWeeks: number // the client's own interval if set before, else the service's
  currentlyActive: boolean
  clientDeclined: boolean
  visitDate: string // "YYYY-MM-DD"
}

// Opening hours per weekday ("0" = Sunday … "6" = Saturday); null = closed.
export type DayHours = { open: string; close: string } | null // "09:00", "19:00"
export type OpeningHours = Record<'0' | '1' | '2' | '3' | '4' | '5' | '6', DayHours>

export const WEEKDAYS_RO = ['Duminică', 'Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă'] as const

// A bookable start time on one day, for the client's calendar.
export type Slot = { time: string; available: boolean }

// How one day looks in a month calendar.
export type DayState = 'past' | 'closed' | 'event' | 'full' | 'available'
export type DayInfo = { date: string; state: DayState; eventTitle?: string }

export type CalendarEventView = { id: string; title: string; start: string; end: string; allDay: boolean; notes: string | null }

export type RequestTypeKey = 'CANCEL' | 'RESCHEDULE'
export type RequestStatusKey = 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED' | 'WITHDRAWN'

// A client's cancel/reschedule request, as the admin sees it.
export type RequestView = {
  id: string
  type: RequestTypeKey
  status: RequestStatusKey
  message: string | null
  adminNote: string | null
  createdAt: string
  decidedAt: string | null
  appointmentId: string
  appointmentStart: string
  serviceTitle: string
  clientId: string
  clientName: string
  clientPhone: string | null
}

export type EventFormState = {
  errors?: Partial<Record<string, string[]>>
  ok?: boolean
  // Appointments already inside the new event, for the admin to handle.
  conflicts?: { id: string; clientName: string; start: string }[]
}
