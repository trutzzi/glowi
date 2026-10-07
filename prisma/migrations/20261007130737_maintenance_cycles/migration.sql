/*
  Warnings:

  - Added the required column `intervalWeeks` to the `Maintenance` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastVisitAt` to the `Maintenance` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Maintenance` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Maintenance" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "clientDeclined" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "intervalWeeks" INTEGER NOT NULL,
ADD COLUMN     "lastVisitAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "smsSentAt" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "dueDate" SET DATA TYPE DATE;

-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "maintenanceWeeks" INTEGER;

-- CreateIndex
CREATE INDEX "Maintenance_active_clientDeclined_smsSentAt_dueDate_idx" ON "Maintenance"("active", "clientDeclined", "smsSentAt", "dueDate");
