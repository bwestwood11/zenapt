import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getDateKeyInTimeZone } from "@/components/calendar/timezone";
import { getLocationAccess } from "@/lib/permissions/permission";
import { serverTRPC } from "@/utils/server-trpc";
import { CalendarDays, Settings, UserPlus, Users } from "lucide-react";
import Link from "next/link";
import SpecialistDashboardClient from "./_components/specialist-dashboard-client";
import { forbidden } from "next/navigation";

const roleToLabel = (role: string) =>
  role
    .replaceAll("_", " ")
    .toLowerCase()
    .replaceAll(/\b\w/g, (char) => char.toUpperCase());

const NonSpecialistDashboard = async ({
  slug,
  locationId,
  role,
}: {
  slug: string;
  locationId: string;
  role: "LOCATION_ADMIN" | "LOCATION_FRONT_DESK" | "ORGANIZATION_MANAGEMENT";
}) => {
  let locationTimeZone = "UTC";

  try {
    const location = await serverTRPC.location.getLocation.fetch({ slug });
    locationTimeZone = location?.timeZone ?? "UTC";
  } catch (error) {
    console.error("[location.dashboard] Failed to fetch location details", error);
  }

  const todayKey = getDateKeyInTimeZone(new Date(), locationTimeZone);

  const [appointmentsForToday, customersTotal, employeeCount] = await Promise.all([
    (async () => {
      try {
        const data = await serverTRPC.appointment.fetchAppointments.fetch({
          locationId,
          dateKey: todayKey,
        });

        return data[todayKey]?.length ?? 0;
      } catch (error) {
        console.error("[location.dashboard] Failed to fetch appointments", error);
        return null;
      }
    })(),
    (async () => {
      try {
        const data = await serverTRPC.customers.getAllCustomers.fetch({
          locationId,
          page: 1,
          limit: 1,
        });

        return data.pagination.total;
      } catch (error) {
        console.error("[location.dashboard] Failed to fetch customer stats", error);
        return null;
      }
    })(),
    role === "LOCATION_FRONT_DESK"
      ? Promise.resolve(null)
      : (async () => {
          try {
            const data = await serverTRPC.location.getLocationEmployees.fetch({ slug });
            return data.length;
          } catch (error) {
            console.error("[location.dashboard] Failed to fetch employee stats", error);
            return null;
          }
        })(),
  ]);

  const isManagement =
    role === "LOCATION_ADMIN" || role === "ORGANIZATION_MANAGEMENT";

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Location Dashboard</h1>
          <p className="text-muted-foreground">Role: {roleToLabel(role)}</p>
        </div>
        <Badge variant="secondary" className="capitalize">
          {roleToLabel(role)} view
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Appointments today</CardDescription>
            <CardTitle className="text-2xl">
              {appointmentsForToday ?? "--"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Scheduled on {todayKey}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total customers</CardDescription>
            <CardTitle className="text-2xl">{customersTotal ?? "--"}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Active customer base for this location
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Team members</CardDescription>
            <CardTitle className="text-2xl">
              {isManagement ? (employeeCount ?? "--") : "N/A"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {isManagement
              ? "Employees assigned to this location"
              : "Visible for management roles"}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            {isManagement
              ? "Common actions for location managers"
              : "Common actions for front desk operations"}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Link href={`/dashboard/l/${slug}/customers`}>
            <Button variant="outline" className="w-full justify-start">
              <Users className="mr-2 h-4 w-4" />
              View Customers
            </Button>
          </Link>

          {isManagement ? (
            <>
              <Link href={`/dashboard/l/${slug}/master-calendar`}>
                <Button variant="outline" className="w-full justify-start">
                  <CalendarDays className="mr-2 h-4 w-4" />
                  Open Master Calendar
                </Button>
              </Link>

              <Link href={`/dashboard/l/${slug}/employees`}>
                <Button variant="outline" className="w-full justify-start">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Manage Employees
                </Button>
              </Link>

              <Link href={`/dashboard/l/${slug}/location-settings`}>
                <Button variant="outline" className="w-full justify-start">
                  <Settings className="mr-2 h-4 w-4" />
                  Location Settings
                </Button>
              </Link>
            </>
          ) : null}
        </CardContent>
      </Card>
    </>
  );
};

const LocationPage = async ({
  params,
}: Readonly<{
  params: Promise<{ slug: string }>;
}>) => {
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
  const isSupportedNonSpecialistRole =
    role === "LOCATION_ADMIN" ||
    role === "LOCATION_FRONT_DESK" ||
    role === "ORGANIZATION_MANAGEMENT";

  let dashboardContent: React.ReactNode;

  if (isSpecialist) {
    dashboardContent = (
      <SpecialistDashboardClient
        locationId={locationAccess.locationId}
        slug={slug}
        role={role}
      />
    );
  } else if (isSupportedNonSpecialistRole) {
    dashboardContent = (
      <NonSpecialistDashboard
        slug={slug}
        locationId={locationAccess.locationId}
        role={role}
      />
    );
  } else {
    dashboardContent = (
      <Card>
        <CardHeader>
          <CardTitle>Dashboard</CardTitle>
          <CardDescription>
            No dashboard view is configured for this role yet.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="p-6 space-y-6">{dashboardContent}</div>
  );
};

export default LocationPage;
