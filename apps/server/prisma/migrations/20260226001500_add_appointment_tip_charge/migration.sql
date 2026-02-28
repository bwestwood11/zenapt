-- CreateTable
CREATE TABLE "public"."AppointmentTipCharge" (
    "_id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "public"."CustomerPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paymentMethod" TEXT NOT NULL,
    "transactionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppointmentTipCharge_pkey" PRIMARY KEY ("_id")
);

-- CreateIndex
CREATE INDEX "AppointmentTipCharge_appointmentId_idx" ON "public"."AppointmentTipCharge"("appointmentId");

-- CreateIndex
CREATE INDEX "AppointmentTipCharge_customerId_appointmentId_idx" ON "public"."AppointmentTipCharge"("customerId", "appointmentId");

-- AddForeignKey
ALTER TABLE "public"."AppointmentTipCharge" ADD CONSTRAINT "AppointmentTipCharge_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "public"."Appointment"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AppointmentTipCharge" ADD CONSTRAINT "AppointmentTipCharge_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."Customer"("_id") ON DELETE RESTRICT ON UPDATE CASCADE;
