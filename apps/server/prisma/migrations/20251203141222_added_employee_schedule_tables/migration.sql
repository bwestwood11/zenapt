-- CreateEnum
CREATE TYPE "public"."ScheduleTargetType" AS ENUM ('LOCATION', 'EMPLOYEE');

-- CreateTable
CREATE TABLE "public"."ScheduleRule" (
    "_id" TEXT NOT NULL,
    "targetType" "public"."ScheduleTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "daysMask" INTEGER NOT NULL,
    "startMinute" INTEGER NOT NULL,
    "endMinute" INTEGER NOT NULL,
    "isBreak" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduleRule_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "public"."ScheduleException" (
    "_id" TEXT NOT NULL,
    "targetType" "public"."ScheduleTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startMinute" INTEGER NOT NULL,
    "endMinute" INTEGER NOT NULL,
    "isBreak" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduleException_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "public"."TimeOff" (
    "_id" TEXT NOT NULL,
    "targetType" "public"."ScheduleTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimeOff_pkey" PRIMARY KEY ("_id")
);

-- CreateIndex
CREATE INDEX "ScheduleRule_targetType_targetId_idx" ON "public"."ScheduleRule"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "ScheduleException_targetType_targetId_date_idx" ON "public"."ScheduleException"("targetType", "targetId", "date");

-- CreateIndex
CREATE INDEX "TimeOff_targetType_targetId_startDate_endDate_idx" ON "public"."TimeOff"("targetType", "targetId", "startDate", "endDate");
