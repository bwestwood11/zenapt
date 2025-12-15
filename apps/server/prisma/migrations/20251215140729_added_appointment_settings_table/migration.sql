-- CreateTable
CREATE TABLE "public"."AppointmentSettings" (
    "_id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "bufferTime" INTEGER NOT NULL DEFAULT 0,
    "prpTime" INTEGER NOT NULL DEFAULT 0,
    "advanceBookingLimitDays" INTEGER NOT NULL DEFAULT 60,
    "bookingCutOff" INTEGER NOT NULL DEFAULT 60,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppointmentSettings_pkey" PRIMARY KEY ("_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AppointmentSettings_locationId_key" ON "public"."AppointmentSettings"("locationId");

-- CreateIndex
CREATE INDEX "AppointmentSettings_locationId_idx" ON "public"."AppointmentSettings"("locationId");

-- AddForeignKey
ALTER TABLE "public"."AppointmentSettings" ADD CONSTRAINT "AppointmentSettings_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("_id") ON DELETE CASCADE ON UPDATE CASCADE;
