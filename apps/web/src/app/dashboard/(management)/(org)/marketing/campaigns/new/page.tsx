import { CampaignBuilder } from "@/components/marketing/campaign-builder";
import { requirePermission } from "@/lib/permissions/permission";

export default async function NewMarketingCampaignPage() {
  await requirePermission(["UPDATE::ORGANIZATION"]);

  return (
    <div className="min-h-screen bg-background p-2 sm:p-3 lg:p-4">
      <CampaignBuilder />
    </div>
  );
}