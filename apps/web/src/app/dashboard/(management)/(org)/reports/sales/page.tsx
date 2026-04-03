"use client";

import { ReportBarChart } from "@/components/reports/report-bar-chart";
import { ReportDurationFilter } from "@/components/reports/report-duration-filter";
import {
  getReportDurationLabel,
  REPORT_QUERY_OPTIONS,
} from "@/components/reports/reporting";
import { ReportsEmptyState, ReportsPermissionDeniedState, ReportsLoadingState } from "@/components/reports/reports-state";
import { ReportsShell } from "@/components/reports/reports-shell";
import { useReportDuration } from "@/components/reports/use-report-duration";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePermissions } from "@/lib/permissions/usePermissions";
import { trpc } from "@/utils/trpc";
import { useQuery } from "@tanstack/react-query";
import { CreditCard, DollarSign, ReceiptText, Wallet } from "lucide-react";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});
const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});
const formatCurrency = (amountInCents: number) => currencyFormatter.format(amountInCents / 100);

export default function SalesReportPage() {
  const { checkPermission, isLoadingPermissions } = usePermissions();
  const { duration, setDuration } = useReportDuration();
  const hasAccess = checkPermission(["READ::ORGANIZATION"]);
  const { data, isLoading } = useQuery(
    trpc.organization.getSalesReport.queryOptions({ duration }, {
      enabled: hasAccess,
      ...REPORT_QUERY_OPTIONS,
    }),
  );

  if (isLoadingPermissions) {
    return <ReportsLoadingState message="Loading sales report..." />;
  }

  if (!hasAccess) {
    return <ReportsPermissionDeniedState />;
  }

  if (isLoading || !data) {
    return <ReportsLoadingState message="Loading sales report..." />;
  }

  const { summary, monthlySales, sales } = data;
  const durationLabel = getReportDurationLabel(duration);
  const metricCards = [
    {
      title: "Total sales",
      value: formatCurrency(summary.totalSales),
      description: "Recognized sales across the organization",
      icon: DollarSign,
    },
    {
      title: "This month",
      value: formatCurrency(summary.thisMonthSales),
      description: "Revenue closed in the current month",
      icon: Wallet,
    },
    {
      title: "Average sale",
      value: formatCurrency(summary.averageSaleValue),
      description: "Average ticket size from paid appointments",
      icon: ReceiptText,
    },
    {
      title: "Awaiting payment",
      value: formatCurrency(summary.pendingSales),
      description: "Revenue not yet captured",
      icon: CreditCard,
    },
  ];

  return (
    <ReportsShell
      title="Sales"
      description={`Review sales KPIs, monthly performance, and the latest sales list for ${durationLabel.toLowerCase()}.`}
      breadcrumbHref="/dashboard/reports/sales"
      breadcrumbLabel="Sales"
      actions={<ReportDurationFilter value={duration} onChange={setDuration} />}
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
          <CardTitle>Monthly sales trend</CardTitle>
          <CardDescription>
            Revenue closed over {durationLabel.toLowerCase()}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ReportBarChart
            data={monthlySales.map((item) => ({
              label: item.label,
              value: item.revenue / 100,
              secondaryValue: `${item.appointments} sales`,
            }))}
            valueFormatter={(value) => `$${Math.round(value).toLocaleString()}`}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sales list</CardTitle>
          <CardDescription>
            Latest paid and partially paid appointments within {durationLabel.toLowerCase()}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sales.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Services</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-foreground">{sale.customer.user.name}</p>
                        <p className="text-xs text-muted-foreground">{sale.customer.user.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>{sale.location.name}</TableCell>
                    <TableCell className="max-w-60 whitespace-normal text-sm text-muted-foreground">
                      {sale.services.join(", ") || "No services linked"}
                    </TableCell>
                    <TableCell>{dateFormatter.format(new Date(sale.startTime))}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant="secondary">{sale.paymentStatus.replaceAll("_", " ")}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {sale.status.replaceAll("_", " ")}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(sale.price)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <ReportsEmptyState
              title="No sales yet"
              description="Paid appointments will show up here once revenue starts flowing."
            />
          )}
        </CardContent>
      </Card>
    </ReportsShell>
  );
}
