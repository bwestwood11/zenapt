import { EmployeeCalendar } from "@/components/calendar/calendar";
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

const EmployeeCalendarPage = async ({
  params,
}: {
  params: Promise<{ slug: string }>;
}) => {
  const { slug } = await params;

  if (!slug) {
    return forbidden();
  }

  const locationAccess = await getLocationAccess(slug);
  if (!locationAccess) {
    return forbidden();
  }

  if (!isAllowedRole(locationAccess.role)) {
    return forbidden();
  }

  return <EmployeeCalendar locationId={locationAccess.locationId} />;
};

export default EmployeeCalendarPage;
