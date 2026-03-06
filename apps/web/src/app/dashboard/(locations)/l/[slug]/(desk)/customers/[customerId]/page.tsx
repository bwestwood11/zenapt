import { forbidden } from "next/navigation";
import { getLocationAccess } from "@/lib/permissions/permission";
import CustomerDetailsPageClient from "@/components/customers/CustomerDetailsPageClient";

const ALLOWED_ROLES = [
  "ORGANIZATION_MANAGEMENT",
  "LOCATION_ADMIN",
  "LOCATION_FRONT_DESK",
] as const;

const isAllowedRole = (role: string) => {
  return ALLOWED_ROLES.includes(role as AllowedRole);
};

type AllowedRole = (typeof ALLOWED_ROLES)[number];

export default async function CustomerDetailsPage({
  params,
}: Readonly<{
  params: Promise<{ slug: string; customerId: string }>;
}>) {
  const { slug, customerId } = await params;

  if (!slug || !customerId) {
    return forbidden();
  }

  const locationAccess = await getLocationAccess(slug);
  if (!locationAccess) {
    return forbidden();
  }

  if (!isAllowedRole(locationAccess.role)) {
    return forbidden();
  }

  return (
    <CustomerDetailsPageClient
      slug={slug}
      customerId={customerId}
      locationId={locationAccess.locationId}
    />
  );
}
