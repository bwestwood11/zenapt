"use client";

import Link from "next/link";
import { ReportBarChart } from "@/components/reports/report-bar-chart";
import { ReportsPermissionDeniedState, ReportsLoadingState } from "@/components/reports/reports-state";
import { ReportsShell } from "@/components/reports/reports-shell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { usePermissions } from "@/lib/permissions/usePermissions";
import { trpc } from "@/utils/trpc";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  BarChart3,
  BriefcaseBusiness,
  CreditCard,
  DollarSign,
  ArrowRight,
  Users,
} from "lucide-react";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
});

const formatCurrency = (amountInCents: number) =>
  currencyFormatter.format(amountInCents / 100);

export default function ReportsPage() {
  const { checkPermission, isLoadingPermissions } = usePermissions();
  const hasAccess = checkPermission(["READ::ORGANIZATION"]);
  const { data, isLoading } = useQuery(
    trpc.organization.getReportsOverview.queryOptions(undefined, {
      enabled: hasAccess,
    }),
  );

  if (isLoadingPermissions) {
    return <ReportsLoadingState message="Loading reports..." />;
  }

  if (!hasAccess) {
    return <ReportsPermissionDeniedState />;
  }

  if (isLoading || !data) {
    return <ReportsLoadingState message="Loading overview..." />;
  }

  const { summary, recentCustomers, paymentsAwaiting } = data;

  const summaryCards = [
    {
      title: "Sales",
      value: formatCurrency(summary.totalSales),
      description: "Revenue generated across your organization",
      icon: DollarSign,
    },
    {
      title: "Customers",
      value: summary.totalCustomers.toLocaleString(),
      description: "Customers currently tracked across locations",
      icon: Users,
    },
    {
      title: "Metrics",
      value: summary.totalAppointments.toLocaleString(),
      description: "Appointments recorded across locations",
      icon: Activity,
    },
    {
      title: "Payment awaiting",
      value: summary.paymentsAwaitingCount.toLocaleString(),
      description: "Appointments still waiting for payment",
      icon: CreditCard,
    },
  ];

  const reportSections = [
    {
      title: "Metrics",
      description: "Track appointment trends, status breakdowns, and revenue graphs.",
      href: "/dashboard/reports/metrics",
      icon: BarChart3,
      value: `${summary.totalAppointments.toLocaleString()} tracked`,
    },
    {
      title: "Sales",
      description: "See your sales list, monthly sales graph, and top-line sales KPIs.",
      href: "/dashboard/reports/sales",
      icon: DollarSign,
      value: formatCurrency(summary.totalSales),
    },
    {
      title: "Customers",
      description: "Review customer loyalty, outstanding payments, and customer rankings.",
      href: "/dashboard/reports/customers",
      icon: Users,
      value: `${summary.totalCustomers.toLocaleString()} customers`,
    },
    {
      title: "Specialists",
      description: "Find your highest-performing specialists and compare their output.",
      href: "/dashboard/reports/specialists",
      icon: BriefcaseBusiness,
      value: `${summary.completedAppointments.toLocaleString()} completed`,
    },
  ];

  const snapshotChartData = [
    {
      label: "Sales",
      value: summary.totalSales / 100,
      secondaryValue: formatCurrency(summary.totalSales),
    },
    {
      label: "Customers",
      value: summary.totalCustomers,
      secondaryValue: summary.totalCustomers.toLocaleString(),
    },
    {
      label: "Appointments",
      value: summary.totalAppointments,
      secondaryValue: summary.totalAppointments.toLocaleString(),
    },
    {
      label: "Pending",
      value: summary.paymentsAwaitingCount,
      secondaryValue: summary.paymentsAwaitingCount.toLocaleString(),
    },
  ];

  return (
    <ReportsShell
      title="Reports"
      description="Use the reporting workspace to move from high-level KPIs into metrics, sales, customers, and specialist performance."
      breadcrumbHref="/dashboard/reports"
      breadcrumbLabel="Reports"
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

        <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Snapshot
              </CardTitle>
              <CardDescription>
                A quick read on the health of the organization before drilling into each report page.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ReportBarChart
                data={snapshotChartData}
                valueFormatter={(value) => value.toLocaleString()}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowRight className="h-5 w-5 text-primary" />
                Explore reports
              </CardTitle>
              <CardDescription>
                Jump directly into the report you need.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {reportSections.map((section) => {
                const Icon = section.icon;

                return (
                  <div key={section.href} className="rounded-xl border p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-primary" />
                          <p className="font-medium text-foreground">{section.title}</p>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {section.description}
                        </p>
                        <p className="mt-3 text-sm font-medium text-foreground">
                          {section.value}
                        </p>
                      </div>
                      <Button asChild size="sm" variant="outline">
                        <Link href={section.href}>Open</Link>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Recent customers snapshot
              </CardTitle>
              <CardDescription>
                A quick look at recently added customers.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentCustomers.length ? (
                <div className="space-y-4">
                  {recentCustomers.map((customer, index) => (
                    <div key={customer.id}>
                      <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="font-medium text-foreground">{customer.user.name}</p>
                          <p className="text-sm text-muted-foreground">{customer.user.email}</p>
                        </div>
                        <div className="text-sm text-muted-foreground md:text-right">
                          <p>{customer._count.appointments} appointments</p>
                          <p>{dateFormatter.format(new Date(customer.createdAt))}</p>
                        </div>
                      </div>
                      {index < recentCustomers.length - 1 ? <Separator className="mt-4" /> : null}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                  No customers found.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Payment awaiting snapshot
              </CardTitle>
              <CardDescription>
                Upcoming appointments still waiting for payment.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {paymentsAwaiting.length ? (
                <div className="space-y-4">
                  {paymentsAwaiting.map((payment, index) => (
                    <div key={payment.id}>
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="font-medium text-foreground">{payment.customer.user.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {payment.customer.user.email} · {payment.location.name}
                          </p>
                        </div>
                        <div className="text-sm md:text-right">
                          <p className="font-semibold text-foreground">
                            {formatCurrency(payment.price)}
                          </p>
                          <p className="text-muted-foreground">
                            {dateFormatter.format(new Date(payment.startTime))}
                          </p>
                        </div>
                      </div>
                      {index < paymentsAwaiting.length - 1 ? <Separator className="mt-4" /> : null}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                  No pending payments right now.
                </div>
              )}
            </CardContent>
          </Card>
        </section>
    </ReportsShell>
  );
}