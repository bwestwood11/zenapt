-- AlterTable
ALTER TABLE "public"."ActivityLog" ADD COLUMN     "locationId" TEXT;

-- AddForeignKey
ALTER TABLE "public"."ActivityLog" ADD CONSTRAINT "ActivityLog_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("_id") ON DELETE CASCADE ON UPDATE CASCADE;
