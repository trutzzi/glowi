/*
  Warnings:

  - You are about to drop the column `startsAt` on the `Appointment` table. All the data in the column will be lost.
  - Added the required column `appointmentDate` to the `Appointment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `price` to the `Appointment` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Appointment_userId_startsAt_idx";

-- AlterTable
ALTER TABLE "Appointment" DROP COLUMN "startsAt",
ADD COLUMN     "appointmentDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "price" DECIMAL(10,2) NOT NULL;

-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "price" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Appointment_userId_appointmentDate_idx" ON "Appointment"("userId", "appointmentDate");
