-- CreateTable
CREATE TABLE "public"."MarketingContactList" (
    "_id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "filterMode" TEXT NOT NULL DEFAULT 'ALL',
    "filtersJson" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketingContactList_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "public"."MarketingCampaign" (
    "_id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "contactListId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "audienceSnapshotAt" TIMESTAMP(3),
    "audienceCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketingCampaign_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "public"."MarketingCampaignAudience" (
    "_id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketingCampaignAudience_pkey" PRIMARY KEY ("_id")
);

-- CreateIndex
CREATE INDEX "MarketingContactList_organizationId_updatedAt_idx" ON "public"."MarketingContactList"("organizationId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "MarketingContactList_organizationId_name_key" ON "public"."MarketingContactList"("organizationId", "name");

-- CreateIndex
CREATE INDEX "MarketingCampaign_organizationId_updatedAt_idx" ON "public"."MarketingCampaign"("organizationId", "updatedAt");

-- CreateIndex
CREATE INDEX "MarketingCampaign_templateId_idx" ON "public"."MarketingCampaign"("templateId");

-- CreateIndex
CREATE INDEX "MarketingCampaign_contactListId_idx" ON "public"."MarketingCampaign"("contactListId");

-- CreateIndex
CREATE INDEX "MarketingCampaignAudience_campaignId_createdAt_idx" ON "public"."MarketingCampaignAudience"("campaignId", "createdAt");

-- CreateIndex
CREATE INDEX "MarketingCampaignAudience_customerId_idx" ON "public"."MarketingCampaignAudience"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "MarketingCampaignAudience_campaignId_customerId_key" ON "public"."MarketingCampaignAudience"("campaignId", "customerId");

-- AddForeignKey
ALTER TABLE "public"."MarketingContactList" ADD CONSTRAINT "MarketingContactList_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MarketingCampaign" ADD CONSTRAINT "MarketingCampaign_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MarketingCampaign" ADD CONSTRAINT "MarketingCampaign_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "public"."MarketingEmailTemplate"("_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MarketingCampaign" ADD CONSTRAINT "MarketingCampaign_contactListId_fkey" FOREIGN KEY ("contactListId") REFERENCES "public"."MarketingContactList"("_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MarketingCampaignAudience" ADD CONSTRAINT "MarketingCampaignAudience_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "public"."MarketingCampaign"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MarketingCampaignAudience" ADD CONSTRAINT "MarketingCampaignAudience_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."Customer"("_id") ON DELETE CASCADE ON UPDATE CASCADE;
