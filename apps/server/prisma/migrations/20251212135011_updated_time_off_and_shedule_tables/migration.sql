/*
  Warnings:

  - You are about to drop the column `date` on the `ScheduleException` table. All the data in the column will be lost.
  - Added the required column `monthDay` to the `ScheduleException` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."ScheduleException_targetType_targetId_date_idx";

-- AlterTable
ALTER TABLE "public"."ScheduleException" DROP COLUMN "date",
ADD COLUMN     "monthDay" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "ScheduleException_targetType_targetId_monthDay_idx" ON "public"."ScheduleException"("targetType", "targetId", "monthDay");
