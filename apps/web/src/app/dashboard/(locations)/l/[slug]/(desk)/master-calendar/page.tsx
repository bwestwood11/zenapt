import { MasterCalendar } from "@/components/calendar/calendar";

import { getLocationAccess } from "@/lib/permissions/permission";
import { forbidden } from "next/navigation";

const MasterCalendarPage = async ({
  params,
}: {
  params: Promise<{ slug: string }>;
}) => {
  const { slug } = await params;

  if (!slug) {
    return forbidden();
  }

  const session = await getLocationAccess(slug);
  if (!session) {
    return forbidden();
  }

  const isManagement =
    session.role === "ORGANIZATION_MANAGEMENT" ||
    session.role === "LOCATION_ADMIN";

  if (!isManagement) {
    return forbidden();
  }

  return <MasterCalendar locationId={session.locationId} />;
};

export default MasterCalendarPage;
