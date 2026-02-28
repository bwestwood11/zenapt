import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getLocationAccess } from "@/lib/permissions/permission";
import Link from "next/link";
import SpecialistDashboardClient from "./_components/specialist-dashboard-client";
import { forbidden } from "next/navigation";

const LocationPage = async ({
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

  const role = locationAccess.role;
  const isSpecialist = role === "LOCATION_SPECIALIST";

  return (
    <div className="p-6 space-y-6">
      {isSpecialist ? (
        <SpecialistDashboardClient
          locationId={locationAccess.locationId}
          slug={slug}
          role={role}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Dashboard</CardTitle>
            <CardDescription>
              A role-specific dashboard can be expanded here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href={`/dashboard/l/${slug}/master-calendar`}>
              <Button>Open Master Calendar</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default LocationPage;
