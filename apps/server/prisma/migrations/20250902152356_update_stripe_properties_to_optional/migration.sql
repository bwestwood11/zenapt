-- AlterTable
ALTER TABLE "public"."ManagementMembership" ALTER COLUMN "organizationId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."Subscription" ALTER COLUMN "maximumLocations" DROP NOT NULL,
ALTER COLUMN "usedTexts" DROP NOT NULL,
ALTER COLUMN "usedEmails" DROP NOT NULL,
ALTER COLUMN "maximumTexts" DROP NOT NULL,
ALTER COLUMN "maximumEmails" DROP NOT NULL,
ALTER COLUMN "amountPaid" DROP NOT NULL,
ALTER COLUMN "stripeSubscriptionId" DROP NOT NULL,
ALTER COLUMN "status" DROP NOT NULL,
ALTER COLUMN "priceId" DROP NOT NULL,
ALTER COLUMN "currentPeriodStart" DROP NOT NULL,
ALTER COLUMN "currentPeriodEnd" DROP NOT NULL;
