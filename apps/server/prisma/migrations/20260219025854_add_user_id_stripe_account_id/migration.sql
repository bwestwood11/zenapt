/*
  Warnings:

  - You are about to drop the column `email` on the `Customer` table. All the data in the column will be lost.
  - You are about to drop the column `firstName` on the `Customer` table. All the data in the column will be lost.
  - You are about to drop the column `lastName` on the `Customer` table. All the data in the column will be lost.
  - You are about to drop the column `locationId` on the `Customer` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId,orgId]` on the table `Customer` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[stripeAccountId]` on the table `Organization` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `orgId` to the `Customer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `Customer` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."Customer" DROP CONSTRAINT "Customer_locationId_fkey";

-- DropIndex
DROP INDEX "public"."Customer_email_locationId_key";

-- DropIndex
DROP INDEX "public"."Customer_firstName_idx";

-- AlterTable
ALTER TABLE "public"."Appointment" ADD COLUMN     "bufferTime" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "paymentMethodId" TEXT,
ADD COLUMN     "paymentMethodLast4" TEXT,
ADD COLUMN     "prepTime" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "public"."Customer" DROP COLUMN "email",
DROP COLUMN "firstName",
DROP COLUMN "lastName",
DROP COLUMN "locationId",
ADD COLUMN     "orgId" TEXT NOT NULL,
ADD COLUMN     "userId" TEXT NOT NULL,
ALTER COLUMN "stripeCustomerId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."EmployeeService" ADD COLUMN     "bufferTime" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "prepTime" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "public"."Organization" ADD COLUMN     "stripeAccountId" TEXT;

-- CreateTable
CREATE TABLE "public"."CustomerAuth" (
    "_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "refreshTokenHash" TEXT,
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "customerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,

    CONSTRAINT "CustomerAuth_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "public"."_CustomerToLocation" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CustomerToLocation_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "CustomerAuth_email_key" ON "public"."CustomerAuth"("email");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerAuth_customerId_key" ON "public"."CustomerAuth"("customerId");

-- CreateIndex
CREATE INDEX "_CustomerToLocation_B_index" ON "public"."_CustomerToLocation"("B");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_userId_orgId_key" ON "public"."Customer"("userId", "orgId");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_stripeAccountId_key" ON "public"."Organization"("stripeAccountId");

-- AddForeignKey
ALTER TABLE "public"."Customer" ADD CONSTRAINT "Customer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Customer" ADD CONSTRAINT "Customer_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."Organization"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CustomerAuth" ADD CONSTRAINT "CustomerAuth_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."Customer"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CustomerAuth" ADD CONSTRAINT "CustomerAuth_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CustomerAuth" ADD CONSTRAINT "CustomerAuth_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."Organization"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_CustomerToLocation" ADD CONSTRAINT "_CustomerToLocation_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."Customer"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_CustomerToLocation" ADD CONSTRAINT "_CustomerToLocation_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."Location"("_id") ON DELETE CASCADE ON UPDATE CASCADE;
