/*
  Warnings:

  - You are about to drop the `Service` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "public"."AppointmentStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELED', 'NO_SHOW', 'RESCHEDULED');

-- CreateEnum
CREATE TYPE "public"."PromoLevel" AS ENUM ('ORGANIZATION', 'LOCATION');

-- DropForeignKey
ALTER TABLE "public"."Service" DROP CONSTRAINT "Service_locationEmployeeId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Service" DROP CONSTRAINT "Service_locationId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Service" DROP CONSTRAINT "Service_serviceId_fkey";

-- DropTable
DROP TABLE "public"."Service";

-- CreateTable
CREATE TABLE "public"."Appointment" (
    "_id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "status" "public"."AppointmentStatus" NOT NULL DEFAULT 'SCHEDULED',
    "notes" TEXT,
    "price" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "customerPaymentId" TEXT,
    "promoCodeId" TEXT,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "public"."AddOn" (
    "_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "basPrice" INTEGER NOT NULL,

    CONSTRAINT "AddOn_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "public"."PromoCode" (
    "_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "discount" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "maxUsage" INTEGER,
    "appliesToLevel" "public"."PromoLevel" NOT NULL DEFAULT 'ORGANIZATION',
    "organizationId" TEXT NOT NULL,
    "locationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PromoCode_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "public"."EmployeeService" (
    "_id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "price" INTEGER NOT NULL,
    "duration" INTEGER NOT NULL,
    "locationEmployeeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeService_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "public"."Customer" (
    "_id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "stripeCustomerId" TEXT NOT NULL,
    "status" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phoneNumber" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "public"."CustomerAppointmentPayment" (
    "_id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "amountPaid" INTEGER NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "transactionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerAppointmentPayment_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "public"."_AppointmentToEmployeeService" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_AppointmentToEmployeeService_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "public"."_AddOnToAppointment" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_AddOnToAppointment_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_customerPaymentId_key" ON "public"."Appointment"("customerPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "PromoCode_code_key" ON "public"."PromoCode"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_stripeCustomerId_key" ON "public"."Customer"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_email_locationId_key" ON "public"."Customer"("email", "locationId");

-- CreateIndex
CREATE INDEX "_AppointmentToEmployeeService_B_index" ON "public"."_AppointmentToEmployeeService"("B");

-- CreateIndex
CREATE INDEX "_AddOnToAppointment_B_index" ON "public"."_AddOnToAppointment"("B");

-- AddForeignKey
ALTER TABLE "public"."Appointment" ADD CONSTRAINT "Appointment_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Appointment" ADD CONSTRAINT "Appointment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."Customer"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Appointment" ADD CONSTRAINT "Appointment_customerPaymentId_fkey" FOREIGN KEY ("customerPaymentId") REFERENCES "public"."CustomerAppointmentPayment"("_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Appointment" ADD CONSTRAINT "Appointment_promoCodeId_fkey" FOREIGN KEY ("promoCodeId") REFERENCES "public"."PromoCode"("_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PromoCode" ADD CONSTRAINT "PromoCode_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PromoCode" ADD CONSTRAINT "PromoCode_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EmployeeService" ADD CONSTRAINT "EmployeeService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "public"."ServiceTerms"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EmployeeService" ADD CONSTRAINT "EmployeeService_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EmployeeService" ADD CONSTRAINT "EmployeeService_locationEmployeeId_fkey" FOREIGN KEY ("locationEmployeeId") REFERENCES "public"."LocationEmployee"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CustomerAppointmentPayment" ADD CONSTRAINT "CustomerAppointmentPayment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."Customer"("_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_AppointmentToEmployeeService" ADD CONSTRAINT "_AppointmentToEmployeeService_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."Appointment"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_AppointmentToEmployeeService" ADD CONSTRAINT "_AppointmentToEmployeeService_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."EmployeeService"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_AddOnToAppointment" ADD CONSTRAINT "_AddOnToAppointment_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."AddOn"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_AddOnToAppointment" ADD CONSTRAINT "_AddOnToAppointment_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."Appointment"("_id") ON DELETE CASCADE ON UPDATE CASCADE;
