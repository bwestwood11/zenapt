import { forbidden } from "next/navigation";
import { getLocationAccess } from "@/lib/permissions/permission";
import TimeoffRequestsClient from "./_components/timeoff-requests-client";

const ALLOWED_ROLES = new Set([
  "LOCATION_SPECIALIST",
  "LOCATION_FRONT_DESK",
  "LOCATION_ADMIN",
  "ORGANIZATION_MANAGEMENT",
]);

export default async function TimeoffRequestsPage({
  params,
}: Readonly<{
  params: Promise<{ slug: string }>;
}>) {
  const { slug } = await params;

  if (!slug) {
    return forbidden();
  }

  const access = await getLocationAccess(slug);
  if (!access || !ALLOWED_ROLES.has(access.role)) {
    return forbidden();
  }

  return (
    <TimeoffRequestsClient
      locationId={access.locationId}
      slug={slug}
      role={access.role}
    />
  );
}
