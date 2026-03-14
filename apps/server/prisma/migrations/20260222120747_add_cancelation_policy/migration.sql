-- AlterTable
ALTER TABLE "public"."AppointmentSettings" ADD COLUMN     "cancellationDuration" INTEGER NOT NULL DEFAULT 60,
ADD COLUMN     "cancellationPercent" INTEGER NOT NULL DEFAULT 100;
