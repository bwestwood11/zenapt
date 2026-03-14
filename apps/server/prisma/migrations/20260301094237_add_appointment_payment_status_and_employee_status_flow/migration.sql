-- CreateEnum
CREATE TYPE "public"."AppointmentPaymentStatus" AS ENUM ('PAYMENT_PENDING', 'PARTIALLY_PAID', 'PAID');

-- AlterTable
ALTER TABLE "public"."Appointment" ADD COLUMN     "paymentStatus" "public"."AppointmentPaymentStatus" NOT NULL DEFAULT 'PAYMENT_PENDING';
