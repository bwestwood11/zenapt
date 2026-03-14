import { SetBreadcrumbs } from "@/components/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requirePermission } from "@/lib/permissions/permission";
import { serverTRPC } from "@/utils/server-trpc";
import {
  Activity,
  AlertTriangle,
  Building2,
  Layers3,
  ListChecks,
  Settings,
  UserPlus,
  Users,
} from "lucide-react";
import Link from "next/link";

type HomeStats = {
  locationsCount: number | null;
  unstaffedLocationsCount: number | null;
  membersCount: number | null;
  pendingInvitesCount: number | null;
  serviceGroupsCount: number | null;
  serviceTermsCount: number | null;
  recentActivity24hCount: number | null;
  recentActivities: Array<{
    id: string;
    action: string;
    description: string | null;
    createdAt: Date;
    userName: string | null;
  }>;
};

const formatDateTime = (value: Date) =>
  new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);

const StatCard = ({
  icon,
  label,
  value,
  description,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | null;
  description: string;
}) => (
  <Card>
    <CardHeader className="pb-2">
      <CardDescription className="flex items-center gap-2">
        {icon} {label}
      </CardDescription>
      <CardTitle className="text-2xl">{value ?? "--"}</CardTitle>
    </CardHeader>
    <CardContent className="text-sm text-muted-foreground">{description}</CardContent>
  </Card>
);

async function getHomeStats(): Promise<HomeStats> {
  const [
    locationStats,
    membersCount,
    pendingInvitesCount,
    serviceStats,
    recentActivity24hCount,
    recentActivities,
  ] = await Promise.all([
      (async () => {
        try {
          const locations = await serverTRPC.location.getAllLocations.fetch();
          return {
            locationsCount: locations.length,
            unstaffedLocationsCount: locations.filter(
              (location) => location._count.employees === 0,
            ).length,
          };
        } catch (error) {
          console.error("[dashboard.home] Failed to fetch locations", error);
          return {
            locationsCount: null,
            unstaffedLocationsCount: null,
          };
        }
      })(),
      (async () => {
        try {
          const users = await serverTRPC.organization.getOrganizationUsers.fetch();
          return users.length;
        } catch (error) {
          console.error("[dashboard.home] Failed to fetch org users", error);
          return null;
        }
      })(),
      (async () => {
        try {
          const invites =
            await serverTRPC.invitation.getOrganizationInvitations.fetch({
              page: 1,
              limit: 1,
              status: "PENDING",
            });

          return invites.meta.total;
        } catch (error) {
          console.error("[dashboard.home] Failed to fetch invitations", error);
          return null;
        }
      })(),
      (async () => {
        try {
          const services = await serverTRPC.services.getAllServicesTerms.fetch();
          return {
            serviceGroupsCount: services.length,
            serviceTermsCount: services.reduce(
              (count, group) => count + group.serviceTerms.length,
              0,
            ),
          };
        } catch (error) {
          console.error("[dashboard.home] Failed to fetch services", error);
          return {
            serviceGroupsCount: null,
            serviceTermsCount: null,
          };
        }
      })(),
      (async () => {
        try {
          const logs = await serverTRPC.logs.getOrganizationLogs.fetch({
            page: 1,
            limit: 50,
          });

          const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
          return logs.logs.filter(
            (log) => new Date(log.createdAt).getTime() >= oneDayAgo,
          ).length;
        } catch (error) {
          console.error("[dashboard.home] Failed to fetch 24h activity", error);
          return null;
        }
      })(),
      (async () => {
        try {
          const logs = await serverTRPC.logs.getOrganizationLogs.fetch({
            page: 1,
            limit: 5,
          });

          return logs.logs.map((log) => ({
            id: log.id,
            action: log.action,
            description: log.description ?? null,
            createdAt: log.createdAt,
            userName: log.user?.name ?? null,
          }));
        } catch (error) {
          console.error("[dashboard.home] Failed to fetch logs", error);
          return [];
        }
      })(),
    ]);

  return {
    locationsCount: locationStats.locationsCount,
    unstaffedLocationsCount: locationStats.unstaffedLocationsCount,
    membersCount,
    pendingInvitesCount,
    serviceGroupsCount: serviceStats.serviceGroupsCount,
    serviceTermsCount: serviceStats.serviceTermsCount,
    recentActivity24hCount,
    recentActivities,
  };
}

export default async function HomeDashboardPage() {
  await requirePermission(["READ::ORGANIZATION"]);

  const stats = await getHomeStats();
  const organization = await serverTRPC.organization.getOrganizationDetails.fetch();
  const isStripeConnected = Boolean(organization?.stripeAccountId);

  return (
    <main className="p-4 md:p-6">
      <SetBreadcrumbs
        items={[
          { href: "/dashboard/home", label: "Master Dashboard" },
        ]}
      />

      <div className="mx-auto max-w-7xl space-y-6">
        <Card>
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-2xl">Master Dashboard</CardTitle>
              <CardDescription>
                Organization overview and management shortcuts
              </CardDescription>
            </div>
            <Badge variant="secondary">Organization View</Badge>
          </CardHeader>
        </Card>

        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">Overview</h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard
              icon={<Building2 className="h-4 w-4" />}
              label="Locations"
              value={stats.locationsCount}
              description="Total active locations in your organization"
            />
            <StatCard
              icon={<Users className="h-4 w-4" />}
              label="Members"
              value={stats.membersCount}
              description="Management members currently in your organization"
            />
            <StatCard
              icon={<UserPlus className="h-4 w-4" />}
              label="Pending invites"
              value={stats.pendingInvitesCount}
              description="Organization invitations awaiting acceptance"
            />
            <StatCard
              icon={<Layers3 className="h-4 w-4" />}
              label="Service groups"
              value={stats.serviceGroupsCount}
              description="Total service categories configured"
            />
            <StatCard
              icon={<ListChecks className="h-4 w-4" />}
              label="Service terms"
              value={stats.serviceTermsCount}
              description="Total services available across the organization"
            />
            <StatCard
              icon={<Activity className="h-4 w-4" />}
              label="Activity (24h)"
              value={stats.recentActivity24hCount}
              description="Organization events in the last 24 hours"
            />
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" /> Latest Activity
                </CardTitle>
                <CardDescription>
                  Top 5 most recent organization-level events
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {stats.recentActivities.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No recent activity found.
                  </p>
                ) : (
                  stats.recentActivities.map((activity) => (
                    <div key={activity.id} className="rounded-md border p-3">
                      <p className="text-sm font-medium">
                        {activity.description ?? activity.action}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {activity.userName ? `${activity.userName} • ` : ""}
                        {formatDateTime(new Date(activity.createdAt))}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {(stats.unstaffedLocationsCount ?? 0) > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" /> Attention Needed
                  </CardTitle>
                  <CardDescription>
                    Staffing setup issue detected for one or more locations.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">
                    {stats.unstaffedLocationsCount} location(s) currently have no employees assigned.
                  </p>
                  <Link href="/dashboard/locations">
                    <Button variant="outline">Review Locations</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : null}
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Payments Setup</CardTitle>
                <CardDescription>
                  Stripe must be connected before appointments can be created.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {isStripeConnected ? (
                  <p className="text-sm text-muted-foreground break-all">
                    Stripe connected: {organization?.stripeAccountId}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Stripe is not connected for this organization.
                  </p>
                )}

                <Link href="/dashboard/settings" className="block">
                  <Button
                    className="w-full"
                    variant={isStripeConnected ? "outline" : "default"}
                  >
                    {isStripeConnected ? "Manage Stripe" : "Connect Stripe"}
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" /> Quick Actions
                </CardTitle>
                <CardDescription>
                  Jump to common management workflows
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2">
                <Link href="/dashboard/locations" className="block">
                  <Button variant="outline" className="w-full justify-start">
                    Manage Locations
                  </Button>
                </Link>
                <Link href="/dashboard/services" className="block">
                  <Button variant="outline" className="w-full justify-start">
                    Manage Services
                  </Button>
                </Link>
                <Link href="/dashboard/activity-log" className="block">
                  <Button variant="outline" className="w-full justify-start">
                    View Activity Logs
                  </Button>
                </Link>
                <Link href="/dashboard/settings" className="block">
                  <Button variant="outline" className="w-full justify-start">
                    Organization Settings
                  </Button>
                </Link>
                <Link href="/dashboard/manage-account" className="block">
                  <Button variant="outline" className="w-full justify-start">
                    Manage Account
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </main>
  );
}
