import AppointmentDetailsPageClient from "@/components/appointments/appointment-details-page-client";
import { getLocationAccess } from "@/lib/permissions/permission";
import { forbidden } from "next/navigation";

const ALLOWED_ROLES = [
  "ORGANIZATION_MANAGEMENT",
  "LOCATION_ADMIN",
  "LOCATION_FRONT_DESK",
  "LOCATION_SPECIALIST",
] as const;

type AllowedRole = (typeof ALLOWED_ROLES)[number];

const isAllowedRole = (role: string) => {
  return ALLOWED_ROLES.includes(role as AllowedRole);
};

export default async function AppointmentDetailsPage({
  params,
}: Readonly<{
  params: Promise<{ slug: string; appointmentId: string }>;
}>) {
  const { slug, appointmentId } = await params;

  if (!slug || !appointmentId) {
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
    <AppointmentDetailsPageClient
      slug={slug}
      locationId={locationAccess.locationId}
      appointmentId={appointmentId}
    />
  );
}
