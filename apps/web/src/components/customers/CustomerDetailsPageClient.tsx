"use client";

import Link from "next/link";
import { format } from "date-fns";
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  Mail,
  Phone,
  User,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { trpc } from "@/utils/trpc";

type CustomerDetailsPageClientProps = {
  slug: string;
  customerId: string;
  locationId: string;
  isSpecialist?: boolean;
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount / 100);
};

export default function CustomerDetailsPageClient({
  slug,
  customerId,
  locationId,
  isSpecialist = false,
}: Readonly<CustomerDetailsPageClientProps>) {
  const detailsQueryOptions = isSpecialist
    ? trpc.customers.getSpecialistCustomerDetails.queryOptions({
        customerId,
        locationId,
      })
    : trpc.customers.getCustomerDetails.queryOptions({
        customerId,
        locationId,
      });

  const analyticsQueryOptions = isSpecialist
    ? trpc.customers.getSpecialistCustomerAnalytics.queryOptions({
        customerId,
        locationId,
      })
    : trpc.customers.getCustomerAnalytics.queryOptions({
        customerId,
        locationId,
      });

  const { data: customerDetails } = useQuery(
    detailsQueryOptions,
  );

  const { data: analytics } = useQuery(
    analyticsQueryOptions,
  );

  if (!customerDetails) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Customer not found</CardTitle>
            <CardDescription>
              The requested customer is unavailable for this location.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild>
              <Link href={`/dashboard/l/${slug}/customers`}>Back to Customers</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Customer Details</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Full profile, metadata, and performance insights
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/dashboard/l/${slug}/customers`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Customers
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{customerDetails.user?.name ?? "Unknown Customer"}</CardTitle>
          <CardDescription>Customer ID: {customerDetails.id}</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex items-start gap-3 rounded-lg border p-4">
            <User className="mt-0.5 h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Name</p>
              <p className="font-medium">{customerDetails.user?.name ?? "N/A"}</p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-lg border p-4">
            <Mail className="mt-0.5 h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="font-medium">{customerDetails.user?.email ?? "N/A"}</p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-lg border p-4">
            <Phone className="mt-0.5 h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Phone</p>
              <p className="font-medium">{customerDetails.phoneNumber ?? "N/A"}</p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-lg border p-4">
            <Calendar className="mt-0.5 h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Date of Birth</p>
              <p className="font-medium">
                {customerDetails.dateOfBirth
                  ? format(customerDetails.dateOfBirth, "MMM d, yyyy")
                  : "N/A"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Metadata</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <p className="mb-1 text-xs text-muted-foreground">Status</p>
            <Badge variant="secondary">{customerDetails.status ?? "N/A"}</Badge>
          </div>
          <div>
            <p className="mb-1 text-xs text-muted-foreground">Member Since</p>
            <p className="font-medium">{format(customerDetails.createdAt, "MMM d, yyyy")}</p>
          </div>
          <div>
            <p className="mb-1 text-xs text-muted-foreground">Last Updated</p>
            <p className="font-medium">{format(customerDetails.updatedAt, "MMM d, yyyy")}</p>
          </div>
          <div>
            <p className="mb-1 text-xs text-muted-foreground">Notes</p>
            <p className="font-medium">{customerDetails.notes ?? "No notes available"}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Insights</CardTitle>
          <CardDescription>Customer analytics and appointment metrics</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground">Total Appointments</p>
            <p className="mt-1 text-2xl font-bold">{analytics?.totalAppointments ?? 0}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground">Completed Appointments</p>
            <p className="mt-1 text-2xl font-bold">{analytics?.completedAppointments ?? 0}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground">Show Rate</p>
            <p className="mt-1 text-2xl font-bold">{analytics?.showRate ?? 0}%</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground">Total Revenue</p>
            <p className="mt-1 flex items-center gap-1 text-2xl font-bold">
              <DollarSign className="h-4 w-4" />
              {formatCurrency(analytics?.totalRevenue ?? 0)}
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground">AOV</p>
            <p className="mt-1 text-2xl font-bold">{formatCurrency(analytics?.aov ?? 0)}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground">Avg Revisit Value</p>
            <p className="mt-1 text-2xl font-bold">
              {formatCurrency(analytics?.avgRevisitValue ?? 0)}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
