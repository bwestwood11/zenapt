/*
  Warnings:

  - You are about to drop the column `token` on the `OrganizationInvitation` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "public"."OrganizationInvitation_token_idx";

-- DropIndex
DROP INDEX "public"."OrganizationInvitation_token_key";

-- AlterTable
ALTER TABLE "public"."OrganizationInvitation" DROP COLUMN "token";
