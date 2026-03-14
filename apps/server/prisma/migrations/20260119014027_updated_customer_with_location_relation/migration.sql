-- CreateIndex
CREATE INDEX "ScheduleRule_targetType_targetId_daysMask_idx" ON "public"."ScheduleRule"("targetType", "targetId", "daysMask");

-- AddForeignKey
ALTER TABLE "public"."Customer" ADD CONSTRAINT "Customer_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("_id") ON DELETE CASCADE ON UPDATE CASCADE;
