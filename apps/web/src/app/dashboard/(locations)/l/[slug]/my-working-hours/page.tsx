import { forbidden } from "next/navigation";
import { getLocationAccess } from "@/lib/permissions/permission";
import MyWorkingHoursClient from "./_components/my-working-hours-client";

export default async function MyWorkingHoursPage({
  params,
}: Readonly<{
  params: Promise<{ slug: string }>;
}>) {
  const { slug } = await params;

  if (!slug) {
    return forbidden();
  }

  const session = await getLocationAccess(slug);
  if (!session) {
    return forbidden();
  }

  if (session.role !== "LOCATION_SPECIALIST") {
    return forbidden();
  }

  return <MyWorkingHoursClient locationId={session.locationId} slug={slug} />;
}
