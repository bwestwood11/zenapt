-- CreateEnum
CREATE TYPE "public"."InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

-- AlterTable
ALTER TABLE "public"."user" ADD COLUMN     "isTempPassword" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "public"."OrganizationInvitation" (
    "_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "encryptedPassword" TEXT NOT NULL,
    "role" "public"."OrgRole" NOT NULL,
    "status" "public"."InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "token" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "expAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationInvitation_pkey" PRIMARY KEY ("_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationInvitation_email_key" ON "public"."OrganizationInvitation"("email");

-- AddForeignKey
ALTER TABLE "public"."OrganizationInvitation" ADD CONSTRAINT "OrganizationInvitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("_id") ON DELETE CASCADE ON UPDATE CASCADE;
