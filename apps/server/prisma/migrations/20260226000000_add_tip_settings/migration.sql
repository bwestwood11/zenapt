-- AlterTable
ALTER TABLE "public"."AppointmentSettings"
ADD COLUMN "tipEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "tipPresetPercentages" INTEGER[] NOT NULL DEFAULT ARRAY[15, 20, 25];
