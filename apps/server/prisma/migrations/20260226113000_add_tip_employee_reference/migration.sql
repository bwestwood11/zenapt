-- AlterTable
ALTER TABLE "public"."AppointmentTipCharge"
ADD COLUMN "locationEmployeeId" TEXT;

-- CreateIndex
CREATE INDEX "AppointmentTipCharge_locationEmployeeId_idx" ON "public"."AppointmentTipCharge"("locationEmployeeId");

-- AddForeignKey
ALTER TABLE "public"."AppointmentTipCharge"
ADD CONSTRAINT "AppointmentTipCharge_locationEmployeeId_fkey"
FOREIGN KEY ("locationEmployeeId") REFERENCES "public"."LocationEmployee"("_id")
ON DELETE SET NULL ON UPDATE CASCADE;
