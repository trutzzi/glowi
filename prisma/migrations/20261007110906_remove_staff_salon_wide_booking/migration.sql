/*
  Warnings:

  - You are about to drop the column `staffId` on the `Appointment` table. All the data in the column will be lost.
  - You are about to drop the `Staff` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `WorkingHours` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_ServiceToStaff` table. If the table is not empty, all the data it contains will be lost.

*/
-- Replace the per-staff no-double-booking rule (hand-written).
ALTER TABLE "Appointment" DROP CONSTRAINT "Appointment_no_double_booking";

-- DropForeignKey
ALTER TABLE "Appointment" DROP CONSTRAINT "Appointment_staffId_fkey";

-- DropForeignKey
ALTER TABLE "WorkingHours" DROP CONSTRAINT "WorkingHours_staffId_fkey";

-- DropForeignKey
ALTER TABLE "_ServiceToStaff" DROP CONSTRAINT "_ServiceToStaff_A_fkey";

-- DropForeignKey
ALTER TABLE "_ServiceToStaff" DROP CONSTRAINT "_ServiceToStaff_B_fkey";

-- DropIndex
DROP INDEX "Appointment_staffId_appointmentDate_idx";

-- AlterTable
ALTER TABLE "Appointment" DROP COLUMN "staffId";

-- DropTable
DROP TABLE "Staff";

-- DropTable
DROP TABLE "WorkingHours";

-- DropTable
DROP TABLE "_ServiceToStaff";

-- No double booking, salon-wide (hand-written; Prisma's schema cannot express this).
-- The salon takes one appointment at a time: no two appointments may have
-- overlapping [appointmentDate, endsAt) ranges. Appointments cancelled ahead of
-- time free their slot, so they are excluded; HONORED and NOT_HONORED keep it.
ALTER TABLE "Appointment"
  ADD CONSTRAINT "Appointment_no_double_booking"
  EXCLUDE USING gist (
    tsrange("appointmentDate", "endsAt", '[)') WITH &&
  )
  WHERE ("status" IN ('SCHEDULED', 'HONORED', 'NOT_HONORED'));
