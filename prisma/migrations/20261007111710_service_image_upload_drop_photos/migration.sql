/*
  Warnings:

  - You are about to drop the column `image` on the `Service` table. All the data in the column will be lost.
  - You are about to drop the `ClientPhoto` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ClientPhoto" DROP CONSTRAINT "ClientPhoto_appointmentId_fkey";

-- DropForeignKey
ALTER TABLE "ClientPhoto" DROP CONSTRAINT "ClientPhoto_userId_fkey";

-- AlterTable
ALTER TABLE "Service" DROP COLUMN "image";

-- DropTable
DROP TABLE "ClientPhoto";

-- DropEnum
DROP TYPE "PhotoKind";

-- CreateTable
CREATE TABLE "ServiceImage" (
    "serviceId" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "mimeType" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceImage_pkey" PRIMARY KEY ("serviceId")
);

-- AddForeignKey
ALTER TABLE "ServiceImage" ADD CONSTRAINT "ServiceImage_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;
