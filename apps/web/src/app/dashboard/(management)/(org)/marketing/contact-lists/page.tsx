import { MarketingContactListsOverview } from "@/components/marketing/contact-lists-overview";
import { requirePermission } from "@/lib/permissions/permission";

export default async function MarketingContactListsPage() {
  await requirePermission(["READ::ORGANIZATION"]);

  return (
    <div className="min-h-screen bg-background p-2 sm:p-3 lg:p-4">
      <MarketingContactListsOverview />
    </div>
  );
}