"use client";

import { ReportBarChart } from "@/components/reports/report-bar-chart";
import { ReportsEmptyState, ReportsPermissionDeniedState, ReportsLoadingState } from "@/components/reports/reports-state";
import { ReportsShell } from "@/components/reports/reports-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePermissions } from "@/lib/permissions/usePermissions";
import { trpc } from "@/utils/trpc";
import { useQuery } from "@tanstack/react-query";
import { Award, BriefcaseBusiness, CalendarCheck2, DollarSign } from "lucide-react";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});
const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
});
const formatCurrency = (amountInCents: number) => currencyFormatter.format(amountInCents / 100);

export default function SpecialistsReportPage() {
  const { checkPermission, isLoadingPermissions } = usePermissions();
  const hasAccess = checkPermission(["READ::ORGANIZATION"]);
  const { data, isLoading } = useQuery(
    trpc.organization.getSpecialistsReport.queryOptions(undefined, {
      enabled: hasAccess,
    }),
  );

  if (isLoadingPermissions) {
    return <ReportsLoadingState message="Loading specialists report..." />;
  }

  if (!hasAccess) {
    return <ReportsPermissionDeniedState />;
  }

  if (isLoading || !data) {
    return <ReportsLoadingState message="Loading specialists report..." />;
  }

  const { summary, chartData, specialists } = data;
  const metricCards = [
    {
      title: "Specialists",
      value: summary.totalSpecialists.toLocaleString(),
      description: "Active specialists with organization access",
      icon: BriefcaseBusiness,
    },
    {
      title: "Attributed revenue",
      value: formatCurrency(summary.totalRevenue),
      description: "Revenue allocated from specialist-linked services",
      icon: DollarSign,
    },
    {
      title: "Avg appointments",
      value: summary.averageAppointmentsPerSpecialist.toLocaleString(),
      description: "Average appointments handled per specialist",
      icon: CalendarCheck2,
    },
    {
      title: "Top specialist",
      value: summary.topSpecialist?.name ?? "--",
      description: summary.topSpecialist
        ? formatCurrency(summary.topSpecialist.revenue)
        : "No specialist data yet",
      icon: Award,
    },
  ];

  return (
    <ReportsShell
      title="Specialists"
      description="See top-performing specialists by attributed revenue and appointment volume."
      breadcrumbHref="/dashboard/reports/specialists"
      breadcrumbLabel="Specialists"
    >
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((card) => {
          const Icon = card.icon;

          return (
            <Card key={card.title}>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  {card.title}
                </CardDescription>
                <CardTitle className="text-2xl">{card.value}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {card.description}
              </CardContent>
            </Card>
          );
        })}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Top specialists chart</CardTitle>
          <CardDescription>
            Specialists ranked by attributed revenue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length ? (
            <ReportBarChart
              data={chartData.map((item) => ({
                label: item.name,
                value: item.revenue / 100,
                secondaryValue: `${item.appointments} appts`,
              }))}
              valueFormatter={(value) => `$${Math.round(value).toLocaleString()}`}
              barClassName="bg-violet-500"
            />
          ) : (
            <ReportsEmptyState
              title="No specialist performance yet"
              description="Once specialists are assigned to booked services, their performance will appear here."
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Specialist ranking</CardTitle>
          <CardDescription>
            Compare specialists by revenue, appointments, and recency.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {specialists.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Specialist</TableHead>
                  <TableHead>Locations</TableHead>
                  <TableHead>Appointments</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Last appointment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {specialists.map((specialist) => (
                  <TableRow key={specialist.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-foreground">{specialist.name}</p>
                        <p className="text-xs text-muted-foreground">{specialist.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {specialist.locations.map((location) => (
                          <Badge key={`${specialist.id}-${location}`} variant="secondary">
                            {location}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>{specialist.appointmentsCount.toLocaleString()}</TableCell>
                    <TableCell>{specialist.completedAppointments.toLocaleString()}</TableCell>
                    <TableCell>{formatCurrency(specialist.revenue)}</TableCell>
                    <TableCell>
                      {specialist.lastAppointmentAt
                        ? dateFormatter.format(new Date(specialist.lastAppointmentAt))
                        : "--"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <ReportsEmptyState
              title="No specialists available"
              description="Specialist performance will be listed here once bookings are linked to specialists."
            />
          )}
        </CardContent>
      </Card>
    </ReportsShell>
  );
}
