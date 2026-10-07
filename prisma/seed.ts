import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

// Demo catalogue. price 0 shows as "Preț la cerere" (price on request).
// The first four slugs existed before the Romanian translation; keeping them
// updates those rows in place instead of creating duplicates.
const categories = [
  { name: "Păr", sortOrder: 1 },
  { name: "Unghii", sortOrder: 2 },
  { name: "Îngrijirea tenului", sortOrder: 3 },
  { name: "Gene și sprâncene", sortOrder: 4 },
  { name: "Machiaj", sortOrder: 5 },
];

type SeedService = {
  slug: string;
  category: string;
  title: string;
  description: string;
  price: number; // lei; 0 = la cerere
  durationMin: number;
  bufferMin: number;
  maintenanceWeeks?: number; // how often clients typically come back; omitted = no maintenance
};

const services: SeedService[] = [
  // Păr
  { slug: "haircuts", category: "Păr", title: "Tuns și coafat damă", description: "Tuns modern, spălat și coafat", price: 120, durationMin: 60, bufferMin: 10, maintenanceWeeks: 6 },
  { slug: "tuns-barbati", category: "Păr", title: "Tuns bărbați", description: "Tuns clasic sau modern, cu finisaj", price: 70, durationMin: 30, bufferMin: 10, maintenanceWeeks: 4 },
  { slug: "vopsit-radacina", category: "Păr", title: "Vopsit rădăcină", description: "Vopsire rădăcină, cu spălat și uscat", price: 220, durationMin: 90, bufferMin: 15, maintenanceWeeks: 5 },
  { slug: "balayage", category: "Păr", title: "Balayage", description: "Decolorare și nuanțare personalizată, în funcție de lungimea părului", price: 0, durationMin: 180, bufferMin: 15, maintenanceWeeks: 12 },
  { slug: "tratament-keratina", category: "Păr", title: "Tratament cu keratină", description: "Netezire și hidratare intensă; prețul depinde de lungimea părului", price: 0, durationMin: 150, bufferMin: 15, maintenanceWeeks: 12 },
  // Unghii
  { slug: "nails", category: "Unghii", title: "Manichiură clasică", description: "Pilire, cuticule și lac obișnuit", price: 80, durationMin: 45, bufferMin: 10, maintenanceWeeks: 3 },
  { slug: "manichiura-semipermanenta", category: "Unghii", title: "Manichiură semipermanentă", description: "Oja semipermanentă, rezistentă 2–3 săptămâni", price: 130, durationMin: 60, bufferMin: 10, maintenanceWeeks: 3 },
  { slug: "unghii-gel", category: "Unghii", title: "Construcție unghii cu gel", description: "Alungire și modelare cu gel", price: 180, durationMin: 120, bufferMin: 10, maintenanceWeeks: 3 },
  { slug: "pedichiura", category: "Unghii", title: "Pedichiură", description: "Îngrijirea completă a picioarelor, cu lac", price: 150, durationMin: 60, bufferMin: 15, maintenanceWeeks: 4 },
  { slug: "nail-art", category: "Unghii", title: "Nail art", description: "Decoruri pictate manual; preț după model", price: 0, durationMin: 30, bufferMin: 0 },
  // Îngrijirea tenului
  { slug: "skincare", category: "Îngrijirea tenului", title: "Tratament facial hidratant", description: "Curățare, mască și masaj facial", price: 200, durationMin: 60, bufferMin: 15, maintenanceWeeks: 4 },
  { slug: "curatare-faciala", category: "Îngrijirea tenului", title: "Curățare facială profundă", description: "Curățare cu ultrasunete și extracții", price: 180, durationMin: 75, bufferMin: 15, maintenanceWeeks: 6 },
  { slug: "microdermabraziune", category: "Îngrijirea tenului", title: "Microdermabraziune", description: "Exfoliere cu cristale; recomandăm o consultație înainte", price: 0, durationMin: 45, bufferMin: 15, maintenanceWeeks: 4 },
  // Gene și sprâncene
  { slug: "pensat", category: "Gene și sprâncene", title: "Pensat sprâncene", description: "Formă și pensat", price: 40, durationMin: 20, bufferMin: 5, maintenanceWeeks: 4 },
  { slug: "laminare-sprancene", category: "Gene și sprâncene", title: "Laminare sprâncene", description: "Fixare și vopsire, efect 6–8 săptămâni", price: 150, durationMin: 45, bufferMin: 10, maintenanceWeeks: 7 },
  { slug: "extensii-gene", category: "Gene și sprâncene", title: "Extensii gene 1:1", description: "Aplicare fir cu fir, aspect natural", price: 250, durationMin: 120, bufferMin: 10, maintenanceWeeks: 3 },
  // Machiaj
  { slug: "beauty", category: "Machiaj", title: "Machiaj de zi", description: "Machiaj natural pentru zi sau birou", price: 150, durationMin: 45, bufferMin: 10 },
  { slug: "machiaj-seara", category: "Machiaj", title: "Machiaj de seară", description: "Machiaj pentru evenimente", price: 200, durationMin: 60, bufferMin: 10 },
  { slug: "machiaj-mireasa", category: "Machiaj", title: "Machiaj de mireasă", description: "Include probă de machiaj; preț în funcție de pachet", price: 0, durationMin: 90, bufferMin: 15 },
];

// In production (NODE_ENV=production) the seed only *adds* what is missing, so it
// never overwrites prices or names the admin changed, and it creates no demo client.
// The admin login comes from ADMIN_EMAIL / ADMIN_PASSWORD (required in production).
const production = process.env.NODE_ENV === "production";

async function main() {
  const adminEmail = (process.env.ADMIN_EMAIL || "admin@glowi.test").toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || (production ? "" : "password123");
  if (production && adminPassword.length < 10) {
    throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD (at least 10 characters) to seed production.");
  }

  const categoryIds = new Map<string, string>();
  for (const c of categories) {
    const row = await db.category.upsert({ where: { name: c.name }, update: production ? {} : { sortOrder: c.sortOrder }, create: c });
    categoryIds.set(c.name, row.id);
  }

  // Pictures are uploaded by the admin in Servicii, so none are seeded.
  for (const { slug, category, ...s } of services) {
    const data = { ...s, categoryId: categoryIds.get(category)! };
    await db.service.upsert({ where: { slug }, update: production ? {} : data, create: { slug, ...data } });
  }

  await db.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: { email: adminEmail, name: "Admin", role: "ADMIN", passwordHash: await bcrypt.hash(adminPassword, 10) },
  });
  if (production) return;

  // Development only: a client to log in with.
  await db.user.upsert({
    where: { email: "client@glowi.test" },
    update: {},
    create: {
      email: "client@glowi.test",
      name: "Elena",
      phone: "+40 712 000 111", // required for SMS reminders
      role: "CLIENT",
      passwordHash: await bcrypt.hash("password123", 10),
    },
  });
}

main().finally(() => db.$disconnect());
