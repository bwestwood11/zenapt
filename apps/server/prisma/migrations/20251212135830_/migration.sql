-- AlterTable
ALTER TABLE "public"."ScheduleException" ADD COLUMN     "reason" TEXT,
ALTER COLUMN "startMinute" DROP NOT NULL,
ALTER COLUMN "endMinute" DROP NOT NULL;
