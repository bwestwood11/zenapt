/*
  Warnings:

  - A unique constraint covering the columns `[email,status,locationId]` on the table `LocationInvitation` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."LocationInvitation_email_status_key";

-- CreateIndex
CREATE UNIQUE INDEX "LocationInvitation_email_status_locationId_key" ON "public"."LocationInvitation"("email", "status", "locationId");
