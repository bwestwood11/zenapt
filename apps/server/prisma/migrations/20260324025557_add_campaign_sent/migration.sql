-- AlterTable
ALTER TABLE "public"."MarketingCampaign" ADD COLUMN     "deliveryError" TEXT,
ADD COLUMN     "sentAt" TIMESTAMP(3),
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'DRAFT';
