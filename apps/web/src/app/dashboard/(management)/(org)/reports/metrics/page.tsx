"use client";

import { ReportBarChart } from "@/components/reports/report-bar-chart";
import { ReportDurationFilter } from "@/components/reports/report-duration-filter";
import { ReportLocationFilter } from "@/components/reports/report-location-filter";
import { ReportLineChart } from "@/components/reports/report-line-chart";
import {
  getReportDurationLabel,
  REPORT_QUERY_OPTIONS,
} from "@/components/reports/reporting";
import { ReportsPermissionDeniedState, ReportsLoadingState } from "@/components/reports/reports-state";
import { ReportsShell } from "@/components/reports/reports-shell";
import { useReportDuration } from "@/components/reports/use-report-duration";
import { DEFAULT_REPORT_LOCATION, useReportLocation } from "@/components/reports/use-report-location";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { usePermissions } from "@/lib/permissions/usePermissions";
import { trpc } from "@/utils/trpc";
import { useQuery } from "@tanstack/react-query";
import { Activity, CalendarCheck2, CircleDollarSign, Clock3, ShieldAlert, TimerReset } from "lucide-react";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const percentFormatter = (value: number) => `${value.toFixed(1)}%`;
const formatCurrency = (amountInCents: number) => currencyFormatter.format(amountInCents / 100);

export default function MetricsReportPage() {
  const { checkPermission, isLoadingPermissions } = usePermissions();
  const { duration, setDuration } = useReportDuration();
  const { locationId, setLocationId } = useReportLocation();
  const hasAccess = checkPermission(["READ::ORGANIZATION"]);
  const selectedLocationId = locationId === DEFAULT_REPORT_LOCATION ? undefined : locationId;
  const { data, isLoading } = useQuery(
    trpc.organization.getMetricsReport.queryOptions({ duration, locationId: selectedLocationId }, {
      enabled: hasAccess,
      ...REPORT_QUERY_OPTIONS,
    }),
  );
  const { data: locations, isLoading: isLoadingLocations } = useQuery(
    trpc.organization.getReportLocations.queryOptions(undefined, {
      enabled: hasAccess,
      ...REPORT_QUERY_OPTIONS,
    }),
  );

  if (isLoadingPermissions) {
    return <ReportsLoadingState message="Loading metrics report..." />;
  }

  if (!hasAccess) {
    return <ReportsPermissionDeniedState />;
  }

  if (isLoading || isLoadingLocations || !data || !locations) {
    return <ReportsLoadingState message="Loading metrics report..." />;
  }

  const { selectedLocation, summary, monthlySeries, statusBreakdown, paymentBreakdown } = data;
  const durationLabel = getReportDurationLabel(duration);
  const locationLabel = selectedLocation?.name ?? "all locations";
  const selectedLocationMeta = [selectedLocation?.city, selectedLocation?.state]
    .filter(Boolean)
    .join(", ");
  const locationDescription = selectedLocation
    ? [selectedLocation.name, selectedLocationMeta].filter(Boolean).join(" • ")
    : "All locations combined";

  const summaryCards = [
    {
      title: "Appointments",
      value: summary.totalAppointments.toLocaleString(),
      description: `Total appointments recorded for ${locationLabel}`,
      icon: Activity,
    },
    {
      title: "Completion rate",
      value: percentFormatter(summary.completionRate),
      description: `Completed appointments as a share of all appointments at ${locationLabel}`,
      icon: CalendarCheck2,
    },
    {
      title: "Revenue",
      value: formatCurrency(summary.totalRevenue),
      description: `Paid and partially paid appointment revenue for ${locationLabel}`,
      icon: CircleDollarSign,
    },
    {
      title: "No-show rate",
      value: percentFormatter(summary.noShowRate),
      description: `Share of appointments marked as no-show at ${locationLabel}`,
      icon: ShieldAlert,
    },
  ];

  return (
    <ReportsShell
      title="Metrics"
      description={`Understand operational trends with appointment graphs, status distribution, and payment health for ${durationLabel.toLowerCase()}. ${locationDescription}.`}
      breadcrumbHref="/dashboard/reports/metrics"
      breadcrumbLabel="Metrics"
      actions={(
        <div className="flex flex-wrap justify-end gap-2">
          <ReportLocationFilter
            value={locationId}
            onChange={setLocationId}
            locations={locations}
          />
          <ReportDurationFilter value={duration} onChange={setDuration} />
        </div>
      )}
    >
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => {
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

      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Appointment trend</CardTitle>
            <CardDescription>
              Appointment volume across {durationLabel.toLowerCase()}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ReportLineChart
              data={monthlySeries.map((item) => ({
                label: item.label,
                value: item.appointments,
                secondaryValue: `${item.completed} completed`,
              }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue trend</CardTitle>
            <CardDescription>
              Paid revenue recognized during {durationLabel.toLowerCase()}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ReportBarChart
              data={monthlySeries.map((item) => ({
                label: item.label,
                value: item.revenue / 100,
                secondaryValue: formatCurrency(item.revenue),
              }))}
              valueFormatter={(value) => `$${Math.round(value).toLocaleString()}`}
              barClassName="bg-emerald-500"
            />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Status breakdown</CardTitle>
            <CardDescription>
              Current distribution of appointment statuses.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {statusBreakdown.map((item) => (
              <div
                key={item.status}
                className="flex items-center justify-between rounded-xl border p-4"
              >
                <div>
                  <p className="text-sm text-muted-foreground">{item.status.replaceAll("_", " ")}</p>
                  <p className="text-lg font-semibold text-foreground">
                    {item.count.toLocaleString()}
                  </p>
                </div>
                <TimerReset className="h-5 w-5 text-primary" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment breakdown</CardTitle>
            <CardDescription>
              See how appointments are distributed by payment status.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {paymentBreakdown.map((item) => (
              <div
                key={item.status}
                className="flex items-center justify-between rounded-xl border p-4"
              >
                <div>
                  <p className="text-sm text-muted-foreground">{item.status.replaceAll("_", " ")}</p>
                  <p className="text-lg font-semibold text-foreground">
                    {item.count.toLocaleString()}
                  </p>
                </div>
                <Clock3 className="h-5 w-5 text-primary" />
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </ReportsShell>
  );
}
