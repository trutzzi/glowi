// Demo data for testing and marketing screenshots. Not part of `prisma db seed`,
// so a real salon never gets demo people by accident.
//
//   npm run db:seed:demo              add or refresh the demo data
//   npm run db:seed:demo -- --remove  remove it again
//
// Demo client logins (password for all: Demo2026):
//   Maria Popescu  0744 555 101   (rich history, allergies, notes)
//   Ana Ionescu    0745 555 202   Ioana Marin   0746 555 303
//   Cristina Pop   0747 555 404   Andreea Stan  0748 555 505
//
// Appointment dates are relative to the day you run it, so the screens always
// show "tomorrow", a visit waiting for attendance, and a few months of history.
// Requires the main seed first (services). Run from the project root.
//
// The demo phone numbers are made up but look real, so this refuses to run while
// SMS sending is live (SMSLINK_TEST is not 1) without SMS_REDIRECT_TO: reminders could reach strangers.
// Add --force to override.
import "dotenv/config";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { salonToUtc, utcToSalon } from "../lib/time";
import { addDays, toDbDate } from "../lib/dates";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

const PASSWORD = "Demo2026";
const ID = "demo-"; // every demo row's id starts with this, which is how --remove finds them

const clients = [
  {
    id: `${ID}maria`,
    name: "Maria Popescu",
    phone: "0744 555 101",
    email: "maria.popescu@example.ro",
    birthday: "1990-05-17",
    allergies: "Latex",
    privateNotes: "Formulă culoare: 7.1 + 20 vol, 35 min. Preferă ceai verde.",
    smsMarketingConsent: true,
    since: -127, // days ago
  },
  { id: `${ID}ana`, name: "Ana Ionescu", phone: "0745 555 202", since: -109 },
  { id: `${ID}ioana`, name: "Ioana Marin", phone: "0746 555 303", since: -88 },
  { id: `${ID}cristina`, name: "Cristina Pop", phone: "0747 555 404", email: "cristina.pop@example.ro", allergies: "Vopsea cu PPD", since: -63 },
  { id: `${ID}andreea`, name: "Andreea Stan", phone: "0748 555 505", since: -23 },
];

type Status = "SCHEDULED" | "HONORED" | "MISSED_ANNOUNCED" | "MISSED_SHORT_NOTICE" | "NOT_HONORED";
// [id, client, service slug, days from today, salon-local time, status, late minutes, admin note]
const appointments: [string, string, string, number, string, Status, number | null, string | null][] = [
  ["a1", "ana", "manichiura-semipermanenta", -1, "11:00", "SCHEDULED", null, null], // waits for attendance
  ["a2", "maria", "vopsit-radacina", 1, "16:30", "SCHEDULED", null, "Nuanța 7.1 ca data trecută"],
  ["a3", "ioana", "pensat", 1, "18:30", "SCHEDULED", null, null],
  ["a4", "cristina", "haircuts", 1, "19:00", "SCHEDULED", null, null],
  ["a5", "andreea", "extensii-gene", 2, "10:00", "SCHEDULED", null, null],
  ["a6", "ana", "curatare-faciala", 3, "12:00", "SCHEDULED", null, null],
  ["a7", "ioana", "machiaj-seara", 4, "17:00", "SCHEDULED", null, null],
  ["f1", "maria", "manichiura-semipermanenta", 15, "15:00", "SCHEDULED", null, null],
  ["p1", "maria", "haircuts", -84, "10:00", "HONORED", null, "Tuns în trepte, a plecat foarte mulțumită"],
  ["p2", "maria", "manichiura-semipermanenta", -56, "13:00", "HONORED", 10, null],
  ["p3", "maria", "vopsit-radacina", -34, "09:00", "HONORED", null, "Nuanța 7.1, 35 min"],
  ["p4", "maria", "pedichiura", -17, "11:00", "MISSED_ANNOUNCED", null, "A anunțat cu 2 zile înainte"],
  ["p5", "maria", "laminare-sprancene", -7, "16:00", "HONORED", null, null],
  ["p6", "cristina", "nails", -12, "10:00", "NOT_HONORED", null, null],
];

// One example of each maintenance state:
// [client, service slug, last visit (days ago), interval weeks, state]
const maintenance: [string, string, number, number, "active" | "sent" | "stopped" | "declined"][] = [
  ["maria", "vopsit-radacina", 34, 5, "active"], // due tomorrow, but Maria is booked → "Are programare"
  ["maria", "laminare-sprancene", 7, 7, "active"], // upcoming
  ["maria", "haircuts", 84, 6, "sent"], // overdue, SMS already sent
  ["ana", "pedichiura", 30, 4, "sent"],
  ["andreea", "extensii-gene", 10, 3, "active"], // upcoming
  ["ioana", "pensat", 20, 4, "stopped"], // stopped by the salon
  ["cristina", "haircuts", 40, 6, "declined"], // turned off by the client
];

// Requests waiting for the admin, and a closed day in the calendar.
const requests: [string, string, "CANCEL" | "RESCHEDULE", string | null][] = [
  ["r1", "a3", "RESCHEDULE", "Se poate muta după ora 17?"], // Ioana
  ["r2", "a5", "CANCEL", "Am o urgență la serviciu"], // Andreea
]
const events: [string, string, number, number][] = [
  ["e1", "Training produse noi", 10, 10], // [key, title, first day (days from today), last day]
]

// Photos for the demo catalogue (prisma/seed-images/<slug>.jpg, from Unsplash).
const photos = ["haircuts", "vopsit-radacina", "nails", "manichiura-semipermanenta", "skincare", "curatare-faciala", "beauty", "machiaj-seara", "pedichiura"];

// "YYYY-MM-DD" in the salon's time zone, `offset` days from today.
function salonDay(offset: number) {
  const today = utcToSalon(new Date()).date;
  const d = new Date(`${today}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}

async function remove() {
  await db.calendarEvent.deleteMany({ where: { id: { startsWith: ID } } });
  const appts = await db.appointment.deleteMany({ where: { id: { startsWith: ID } } }); // requests go with them (cascade)
  const users = await db.user.deleteMany({ where: { id: { startsWith: ID } } }); // their maintenance goes with them (cascade)
  console.log(`Removed ${users.count} demo clients and ${appts.count} demo appointments.`);
  console.log("Service photos were kept; remove them in Servicii → Editează if you don't want them.");
}

async function add() {
  const safe = process.env.SMSLINK_TEST === "1" || Boolean(process.env.SMS_REDIRECT_TO)
  if (!safe && !process.argv.includes("--force")) {
    console.error("Real SMS are on and demo phone numbers are made up. Set SMSLINK_TEST=1 or SMS_REDIRECT_TO=<your phone>, or add --force.");
    process.exitCode = 1;
    return;
  }
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  for (const { id, since, birthday, ...c } of clients) {
    const data = {
      ...c,
      birthday: birthday ? new Date(`${birthday}T00:00:00Z`) : null,
      consentUpdatedAt: c.smsMarketingConsent ? new Date() : null,
      createdAt: new Date(`${salonDay(since)}T09:00:00Z`),
    };
    await db.user.upsert({ where: { id }, update: data, create: { id, role: "CLIENT", passwordHash, ...data } });
  }

  const services = new Map((await db.service.findMany()).map((s) => [s.slug, s]));
  let booked = 0;
  for (const [key, client, slug, day, time, status, lateMinutes, notes] of appointments) {
    const service = services.get(slug);
    if (!service) {
      console.warn(`Skipped ${key}: service "${slug}" not found (run \`npx prisma db seed\` first).`);
      continue;
    }
    const start = salonToUtc(salonDay(day), time);
    const data = {
      userId: `${ID}${client}`,
      serviceId: service.id,
      appointmentDate: start,
      endsAt: new Date(start.getTime() + (service.durationMin + service.bufferMin) * 60_000),
      price: service.price,
      status,
      lateMinutes,
      notes,
      reminderSentAt: null,
    };
    try {
      await db.appointment.upsert({ where: { id: `${ID}${key}` }, update: data, create: { id: `${ID}${key}`, ...data } });
      booked++;
    } catch (error) {
      // The no-double-booking rule refuses a slot already taken by a real appointment.
      if (String(error).includes("Appointment_no_double_booking")) console.warn(`Skipped ${key}: overlaps an existing appointment.`);
      else throw error;
    }
  }

  let cycles = 0;
  for (const [client, slug, daysAgo, weeks, state] of maintenance) {
    const service = services.get(slug);
    if (!service) continue;
    const visitDay = salonDay(-daysAgo);
    const data = {
      intervalWeeks: weeks,
      lastVisitAt: salonToUtc(visitDay, "10:00"),
      dueDate: toDbDate(addDays(visitDay, weeks * 7)),
      active: state !== "stopped",
      clientDeclined: state === "declined",
      // Past-due demo cycles are marked as sent, so the hourly job never texts the made-up numbers.
      smsSentAt: state === "sent" || addDays(visitDay, weeks * 7) <= salonDay(0) ? new Date() : null,
    };
    const userId = `${ID}${client}`;
    await db.maintenance.upsert({
      where: { userId_serviceId: { userId, serviceId: service.id } },
      update: data,
      create: { userId, serviceId: service.id, ...data },
    });
    cycles++;
  }

  for (const [key, apptKey, type, message] of requests) {
    const appointmentId = `${ID}${apptKey}`
    const appt = await db.appointment.findUnique({ where: { id: appointmentId }, select: { userId: true } })
    if (!appt) continue
    const data = { appointmentId, userId: appt.userId, type, message, status: "PENDING" as const, decidedAt: null, completedAt: null, adminNote: null }
    // Only one open request per appointment is allowed, so clear earlier demo runs' leftovers first.
    await db.appointmentRequest.deleteMany({ where: { appointmentId, id: { not: `${ID}${key}` } } })
    await db.appointmentRequest.upsert({ where: { id: `${ID}${key}` }, update: data, create: { id: `${ID}${key}`, ...data } })
  }

  for (const [key, title, first, last] of events) {
    const data = { title, allDay: true, startsAt: salonToUtc(salonDay(first), "00:00"), endsAt: salonToUtc(salonDay(last + 1), "00:00") }
    await db.calendarEvent.upsert({ where: { id: `${ID}${key}` }, update: data, create: { id: `${ID}${key}`, ...data } })
  }

  let added = 0;
  for (const slug of photos) {
    const service = services.get(slug);
    const file = path.join(process.cwd(), "prisma", "seed-images", `${slug}.jpg`);
    if (!service || !existsSync(file)) continue;
    // Only fill services without a picture; never replace one the admin uploaded.
    const has = await db.serviceImage.findUnique({ where: { serviceId: service.id }, select: { serviceId: true } });
    if (has) continue;
    await db.serviceImage.create({ data: { serviceId: service.id, mimeType: "image/jpeg", data: new Uint8Array(readFileSync(file)) } });
    added++;
  }

  console.log(`Demo data ready: ${clients.length} clients, ${booked} appointments, ${cycles} maintenance cycles, ${added} new service photos.`);
  console.log(`Log in at /login with 0744 555 101 and password ${PASSWORD}.`);
  console.log("Restart `npm run dev` (or save a service) so cached service lists pick up new photos.");
}

(process.argv.includes("--remove") ? remove() : add()).finally(() => db.$disconnect());
