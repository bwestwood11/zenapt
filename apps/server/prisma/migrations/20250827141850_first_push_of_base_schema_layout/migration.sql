-- CreateEnum
CREATE TYPE "public"."OrgRole" AS ENUM ('OWNER', 'ADMIN', 'ANALYST');

-- CreateEnum
CREATE TYPE "public"."EmployeeRole" AS ENUM ('LOCATION_ADMIN', 'LOCATION_FRONT_DESK', 'LOCATION_SPECIALIST');

-- CreateTable
CREATE TABLE "public"."Subscription" (
    "_id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "maximumLocations" INTEGER NOT NULL,
    "usedTexts" INTEGER NOT NULL DEFAULT 0,
    "usedEmails" INTEGER NOT NULL DEFAULT 0,
    "maximumTexts" INTEGER NOT NULL,
    "maximumEmails" INTEGER NOT NULL,
    "amountPaid" INTEGER NOT NULL DEFAULT 0,
    "stripeCustomerId" TEXT NOT NULL,
    "stripeSubscriptionId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "lastPaid" TIMESTAMP(3),
    "priceId" TEXT NOT NULL,
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "public"."Organization" (
    "_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "companySize" TEXT DEFAULT '1-10',
    "businessWebsite" TEXT,
    "logo" TEXT,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "public"."ManagementMembership" (
    "_id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "public"."OrgRole" NOT NULL DEFAULT 'ADMIN',
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManagementMembership_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "public"."Location" (
    "_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "zipCode" TEXT,
    "timeZone" TEXT,
    "email" TEXT,
    "phoneNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "public"."LocationEmployee" (
    "_id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "role" "public"."EmployeeRole" NOT NULL DEFAULT 'LOCATION_FRONT_DESK',
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LocationEmployee_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "public"."ActivityLog" (
    "_id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_organizationId_key" ON "public"."Subscription"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_stripeSubscriptionId_key" ON "public"."Subscription"("stripeSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "public"."Organization"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Location_name_organizationId_key" ON "public"."Location"("name", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "LocationEmployee_userId_locationId_key" ON "public"."LocationEmployee"("userId", "locationId");

-- AddForeignKey
ALTER TABLE "public"."Subscription" ADD CONSTRAINT "Subscription_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ManagementMembership" ADD CONSTRAINT "ManagementMembership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ManagementMembership" ADD CONSTRAINT "ManagementMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Location" ADD CONSTRAINT "Location_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LocationEmployee" ADD CONSTRAINT "LocationEmployee_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LocationEmployee" ADD CONSTRAINT "LocationEmployee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ActivityLog" ADD CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ActivityLog" ADD CONSTRAINT "ActivityLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("_id") ON DELETE CASCADE ON UPDATE CASCADE;
