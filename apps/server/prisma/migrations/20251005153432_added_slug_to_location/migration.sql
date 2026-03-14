/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `Location` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `slug` to the `Location` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Location" ADD COLUMN     "slug" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Location_slug_key" ON "public"."Location"("slug");

-- CreateIndex
CREATE INDEX "Location_slug_organizationId_idx" ON "public"."Location"("slug", "organizationId");
