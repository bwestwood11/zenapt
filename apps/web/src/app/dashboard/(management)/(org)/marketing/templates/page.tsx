import { MarketingTemplatesOverview } from "@/components/marketing/marketing-templates-overview";
import { requirePermission } from "@/lib/permissions/permission";

export default async function MarketingTemplatesPage() {
  await requirePermission(["READ::ORGANIZATION"]);

  return (
    <div className="min-h-screen bg-background p-2 sm:p-3 lg:p-4">
      <MarketingTemplatesOverview />
    </div>
  );
}