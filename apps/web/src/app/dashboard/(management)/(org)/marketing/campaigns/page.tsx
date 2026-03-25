import { CampaignsOverview } from "@/components/marketing/campaigns-overview";
import { requirePermission } from "@/lib/permissions/permission";

export default async function MarketingCampaignsPage() {
  await requirePermission(["READ::ORGANIZATION"]);

  return (
    <div className="min-h-screen bg-background p-2 sm:p-3 lg:p-4">
      <CampaignsOverview />
    </div>
  );
}