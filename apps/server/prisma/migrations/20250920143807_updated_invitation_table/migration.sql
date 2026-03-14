/*
  Warnings:

  - A unique constraint covering the columns `[token]` on the table `OrganizationInvitation` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email,status]` on the table `OrganizationInvitation` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."OrganizationInvitation_email_key";

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationInvitation_token_key" ON "public"."OrganizationInvitation"("token");

-- CreateIndex
CREATE INDEX "OrganizationInvitation_token_idx" ON "public"."OrganizationInvitation"("token");

-- CreateIndex
CREATE INDEX "OrganizationInvitation_organizationId_idx" ON "public"."OrganizationInvitation"("organizationId");

-- CreateIndex
CREATE INDEX "OrganizationInvitation_email_idx" ON "public"."OrganizationInvitation"("email");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationInvitation_email_status_key" ON "public"."OrganizationInvitation"("email", "status");
