import { forbidden } from "next/navigation";
import { getLocationAccess } from "@/lib/permissions/permission";
import MyServicesClient from "./_components/my-services-client";

export default async function MyServicesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  if (!slug) {
    return forbidden();
  }

  const session = await getLocationAccess(slug);
  if (!session) {
    return forbidden();
  }

  // Get locationId from the session
  const locationId = session.locationId;

  return <MyServicesClient locationId={locationId} />;
}
