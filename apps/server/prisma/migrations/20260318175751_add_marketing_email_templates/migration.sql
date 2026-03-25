-- CreateTable
CREATE TABLE "public"."MarketingEmailTemplate" (
    "_id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "designJson" TEXT NOT NULL,
    "html" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketingEmailTemplate_pkey" PRIMARY KEY ("_id")
);

-- CreateIndex
CREATE INDEX "MarketingEmailTemplate_organizationId_updatedAt_idx" ON "public"."MarketingEmailTemplate"("organizationId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "MarketingEmailTemplate_organizationId_title_key" ON "public"."MarketingEmailTemplate"("organizationId", "title");

-- AddForeignKey
ALTER TABLE "public"."MarketingEmailTemplate" ADD CONSTRAINT "MarketingEmailTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("_id") ON DELETE CASCADE ON UPDATE CASCADE;
