/*
  Warnings:

  - You are about to drop the column `email` on the `LocationEmployee` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `LocationEmployee` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "public"."EmployeeRole" ADD VALUE 'ORGANIZATION_MANAGEMENT';

-- AlterTable
ALTER TABLE "public"."LocationEmployee" DROP COLUMN "email",
DROP COLUMN "name";
