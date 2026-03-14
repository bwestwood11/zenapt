import { forbidden } from "next/navigation";

import { RecurringBreaksManager } from "@/components/locations/recurring-breaks-manager";
import { getLocationAccess } from "@/lib/permissions/permission";

const ALLOWED_BREAKS_ROLES = new Set([
  "ORGANIZATION_MANAGEMENT",
  "LOCATION_ADMIN",
  "LOCATION_FRONT_DESK",
]);

export default async function RecurringBreaksPage({
  params,
}: Readonly<{
  params: Promise<{ slug: string }>;
}>) {
  const { slug } = await params;

  if (!slug) {
    return forbidden();
  }

  const access = await getLocationAccess(slug);
  if (!access || !ALLOWED_BREAKS_ROLES.has(access.role)) {
    return forbidden();
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <RecurringBreaksManager locationId={access.locationId} slug={slug} />
      </div>
    </div>
  );
}
