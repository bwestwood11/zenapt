/*
  Warnings:

  - You are about to drop the column `customerPaymentId` on the `Appointment` table. All the data in the column will be lost.
  - Added the required column `appointmentId` to the `CustomerAppointmentPayment` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."CustomerPaymentType" AS ENUM ('DOWNPAYMENT', 'BALANCE', 'CANCELLATION', 'REFUND');

-- CreateEnum
CREATE TYPE "public"."CustomerPaymentStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED');

-- DropForeignKey
ALTER TABLE "public"."Appointment" DROP CONSTRAINT "Appointment_customerPaymentId_fkey";

-- DropIndex
DROP INDEX "public"."Appointment_customerPaymentId_key";

-- AlterTable
ALTER TABLE "public"."Appointment" DROP COLUMN "customerPaymentId";

-- AlterTable
ALTER TABLE "public"."AppointmentSettings" ADD COLUMN     "downpaymentPercentage" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "public"."CustomerAppointmentPayment" ADD COLUMN     "appointmentId" TEXT NOT NULL,
ADD COLUMN     "paymentType" "public"."CustomerPaymentType" NOT NULL DEFAULT 'DOWNPAYMENT',
ADD COLUMN     "status" "public"."CustomerPaymentStatus" NOT NULL DEFAULT 'PENDING';

-- CreateIndex
CREATE INDEX "CustomerAppointmentPayment_appointmentId_idx" ON "public"."CustomerAppointmentPayment"("appointmentId");

-- CreateIndex
CREATE INDEX "CustomerAppointmentPayment_customerId_appointmentId_idx" ON "public"."CustomerAppointmentPayment"("customerId", "appointmentId");

-- AddForeignKey
ALTER TABLE "public"."CustomerAppointmentPayment" ADD CONSTRAINT "CustomerAppointmentPayment_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "public"."Appointment"("_id") ON DELETE CASCADE ON UPDATE CASCADE;
