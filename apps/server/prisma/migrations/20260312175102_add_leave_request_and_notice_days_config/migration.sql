-- CreateEnum
CREATE TYPE "public"."LeaveRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'DECLINED');

-- AlterTable
ALTER TABLE "public"."AppointmentSettings" ADD COLUMN     "leaveRequestNoticeDays" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "public"."LeaveRequest" (
    "_id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "locationEmployeeId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "reviewedById" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "reviewNote" TEXT,
    "status" "public"."LeaveRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaveRequest_pkey" PRIMARY KEY ("_id")
);

-- CreateIndex
CREATE INDEX "LeaveRequest_locationId_status_idx" ON "public"."LeaveRequest"("locationId", "status");

-- CreateIndex
CREATE INDEX "LeaveRequest_locationEmployeeId_status_idx" ON "public"."LeaveRequest"("locationEmployeeId", "status");

-- CreateIndex
CREATE INDEX "LeaveRequest_startDate_endDate_idx" ON "public"."LeaveRequest"("startDate", "endDate");

-- AddForeignKey
ALTER TABLE "public"."LeaveRequest" ADD CONSTRAINT "LeaveRequest_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LeaveRequest" ADD CONSTRAINT "LeaveRequest_locationEmployeeId_fkey" FOREIGN KEY ("locationEmployeeId") REFERENCES "public"."LocationEmployee"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LeaveRequest" ADD CONSTRAINT "LeaveRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "public"."user"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LeaveRequest" ADD CONSTRAINT "LeaveRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "public"."user"("_id") ON DELETE SET NULL ON UPDATE CASCADE;
