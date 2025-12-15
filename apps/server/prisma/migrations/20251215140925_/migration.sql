/*
  Warnings:

  - You are about to drop the column `prpTime` on the `AppointmentSettings` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."AppointmentSettings" DROP COLUMN "prpTime",
ADD COLUMN     "prepTime" INTEGER NOT NULL DEFAULT 0;
