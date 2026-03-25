-- CreateEnum
CREATE TYPE "public"."OrganizationEmailVerificationStatus" AS ENUM ('NOT_STARTED', 'PENDING', 'SUCCESS', 'FAILED', 'TEMPORARY_FAILURE');

-- CreateEnum
CREATE TYPE "public"."OrganizationEmailMailFromBehavior" AS ENUM ('USE_DEFAULT_VALUE', 'REJECT_MESSAGE');

-- CreateTable
CREATE TABLE "public"."OrganizationEmailDomain" (
    "_id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "mailFromDomain" TEXT,
    "mailFromBehavior" "public"."OrganizationEmailMailFromBehavior" NOT NULL DEFAULT 'REJECT_MESSAGE',
    "verificationStatus" "public"."OrganizationEmailVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "verifiedForSendingStatus" BOOLEAN NOT NULL DEFAULT false,
    "dkimStatus" "public"."OrganizationEmailVerificationStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "dkimTokens" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "mailFromStatus" "public"."OrganizationEmailVerificationStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "verificationErrorType" TEXT,
    "lastCheckedAt" TIMESTAMP(3),
    "lastVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationEmailDomain_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "public"."OrganizationSenderEmail" (
    "_id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "domainId" TEXT,
    "email" TEXT NOT NULL,
    "displayName" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "verificationStatus" "public"."OrganizationEmailVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "verifiedForSendingStatus" BOOLEAN NOT NULL DEFAULT false,
    "lastCheckedAt" TIMESTAMP(3),
    "lastVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationSenderEmail_pkey" PRIMARY KEY ("_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationEmailDomain_domain_key" ON "public"."OrganizationEmailDomain"("domain");

-- CreateIndex
CREATE INDEX "OrganizationEmailDomain_organizationId_idx" ON "public"."OrganizationEmailDomain"("organizationId");

-- CreateIndex
CREATE INDEX "OrganizationEmailDomain_organizationId_verificationStatus_idx" ON "public"."OrganizationEmailDomain"("organizationId", "verificationStatus");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationSenderEmail_email_key" ON "public"."OrganizationSenderEmail"("email");

-- CreateIndex
CREATE INDEX "OrganizationSenderEmail_organizationId_idx" ON "public"."OrganizationSenderEmail"("organizationId");

-- CreateIndex
CREATE INDEX "OrganizationSenderEmail_organizationId_isDefault_idx" ON "public"."OrganizationSenderEmail"("organizationId", "isDefault");

-- CreateIndex
CREATE INDEX "OrganizationSenderEmail_domainId_idx" ON "public"."OrganizationSenderEmail"("domainId");

-- AddForeignKey
ALTER TABLE "public"."OrganizationEmailDomain" ADD CONSTRAINT "OrganizationEmailDomain_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrganizationSenderEmail" ADD CONSTRAINT "OrganizationSenderEmail_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrganizationSenderEmail" ADD CONSTRAINT "OrganizationSenderEmail_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "public"."OrganizationEmailDomain"("_id") ON DELETE CASCADE ON UPDATE CASCADE;
