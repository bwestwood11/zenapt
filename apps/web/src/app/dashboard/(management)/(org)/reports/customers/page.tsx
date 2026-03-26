"use client";

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
import { CreditCard, Gem, Trophy, Users } from "lucide-react";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});
const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
});
const formatCurrency = (amountInCents: number) => currencyFormatter.format(amountInCents / 100);

export default function CustomersReportPage() {
  const { checkPermission, isLoadingPermissions } = usePermissions();
  const { duration, setDuration } = useReportDuration();
  const hasAccess = checkPermission(["READ::ORGANIZATION"]);
  const { data, isLoading } = useQuery(
    trpc.organization.getCustomersReport.queryOptions({ duration }, {
      enabled: hasAccess,
      ...REPORT_QUERY_OPTIONS,
    }),
  );

  if (isLoadingPermissions) {
    return <ReportsLoadingState message="Loading customers report..." />;
  }

  if (!hasAccess) {
    return <ReportsPermissionDeniedState />;
  }

  if (isLoading || !data) {
    return <ReportsLoadingState message="Loading customers report..." />;
  }

  const { summary, mostLoyalCustomer, customers } = data;
  const durationLabel = getReportDurationLabel(duration);
  const metricCards = [
    {
      title: "Customers",
      value: summary.totalCustomers.toLocaleString(),
      description: "Total customers in the organization",
      icon: Users,
    },
    {
      title: "Active customers",
      value: summary.activeCustomers.toLocaleString(),
      description: "Customers with appointment history",
      icon: Gem,
    },
    {
      title: "Pending payment",
      value: summary.customersWithPendingPayments.toLocaleString(),
      description: "Customers with payment awaiting",
      icon: CreditCard,
    },
    {
      title: "Outstanding amount",
      value: formatCurrency(summary.totalPendingAmount),
      description: "Pending customer payment total",
      icon: Trophy,
    },
  ];

  return (
    <ReportsShell
      title="Customers"
      description={`Understand customer loyalty, pending balances, and who keeps coming back during ${durationLabel.toLowerCase()}.`}
      breadcrumbHref="/dashboard/reports/customers"
      breadcrumbLabel="Customers"
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
          <CardTitle>Most loyal customer</CardTitle>
          <CardDescription>
            The customer with the strongest repeat history during {durationLabel.toLowerCase()}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mostLoyalCustomer ? (
            <div className="grid gap-4 md:grid-cols-4">
              <div className="rounded-xl border p-4 md:col-span-2">
                <p className="text-lg font-semibold text-foreground">{mostLoyalCustomer.user.name}</p>
                <p className="text-sm text-muted-foreground">{mostLoyalCustomer.user.email}</p>
              </div>
              <div className="rounded-xl border p-4">
                <p className="text-sm text-muted-foreground">Appointments</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">
                  {mostLoyalCustomer.totalAppointments.toLocaleString()}
                </p>
              </div>
              <div className="rounded-xl border p-4">
                <p className="text-sm text-muted-foreground">Total spent</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">
                  {formatCurrency(mostLoyalCustomer.totalSpent)}
                </p>
              </div>
            </div>
          ) : (
            <ReportsEmptyState
              title="No loyalty data yet"
              description="Once customers start booking appointments, loyalty insights will appear here."
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Customer list</CardTitle>
          <CardDescription>
            Customers ranked by appointment activity and spending in {durationLabel.toLowerCase()}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {customers.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Appointments</TableHead>
                  <TableHead>Total spent</TableHead>
                  <TableHead>Payment awaiting</TableHead>
                  <TableHead>Last visit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-foreground">{customer.user.name}</p>
                        <p className="text-xs text-muted-foreground">{customer.user.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>{customer.totalAppointments.toLocaleString()}</TableCell>
                    <TableCell>{formatCurrency(customer.totalSpent)}</TableCell>
                    <TableCell>
                      {customer.pendingAmount > 0 ? (
                        <div className="flex flex-col gap-1">
                          <Badge variant="secondary">{formatCurrency(customer.pendingAmount)}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {customer.pendingAppointments} awaiting
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">None</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {customer.lastAppointmentAt
                        ? dateFormatter.format(new Date(customer.lastAppointmentAt))
                        : "No appointments yet"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <ReportsEmptyState
              title="No customers to report yet"
              description="Customers with booking history will appear here."
            />
          )}
        </CardContent>
      </Card>
    </ReportsShell>
  );
}
