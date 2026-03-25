"use client";

import { ReportBarChart } from "@/components/reports/report-bar-chart";
import { ReportsPermissionDeniedState, ReportsLoadingState } from "@/components/reports/reports-state";
import { ReportsShell } from "@/components/reports/reports-shell";
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
  const hasAccess = checkPermission(["READ::ORGANIZATION"]);
  const { data, isLoading } = useQuery(
    trpc.organization.getMetricsReport.queryOptions(undefined, {
      enabled: hasAccess,
    }),
  );

  if (isLoadingPermissions) {
    return <ReportsLoadingState message="Loading metrics report..." />;
  }

  if (!hasAccess) {
    return <ReportsPermissionDeniedState />;
  }

  if (isLoading || !data) {
    return <ReportsLoadingState message="Loading metrics report..." />;
  }

  const { summary, monthlySeries, statusBreakdown, paymentBreakdown } = data;

  const summaryCards = [
    {
      title: "Appointments",
      value: summary.totalAppointments.toLocaleString(),
      description: "Total appointments recorded",
      icon: Activity,
    },
    {
      title: "Completion rate",
      value: percentFormatter(summary.completionRate),
      description: "Completed appointments as a share of all appointments",
      icon: CalendarCheck2,
    },
    {
      title: "Revenue",
      value: formatCurrency(summary.totalRevenue),
      description: "Paid and partially paid appointment revenue",
      icon: CircleDollarSign,
    },
    {
      title: "No-show rate",
      value: percentFormatter(summary.noShowRate),
      description: "Share of appointments marked as no-show",
      icon: ShieldAlert,
    },
  ];

  return (
    <ReportsShell
      title="Metrics"
      description="Understand operational trends with appointment graphs, status distribution, and payment health."
      breadcrumbHref="/dashboard/reports/metrics"
      breadcrumbLabel="Metrics"
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
              Appointment volume over the last six months.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ReportBarChart
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
              Paid revenue recognized over the last six months.
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
