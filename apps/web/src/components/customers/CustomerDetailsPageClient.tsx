"use client";

import Link from "next/link";
import { format } from "date-fns";
import {
  ArrowLeft,
  Calendar,
  Clock,
  DollarSign,
  Mail,
  Phone,
  User,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/utils/trpc";

type CustomerDetailsPageClientProps = {
  slug: string;
  customerId: string;
  locationId: string;
  isSpecialist?: boolean;
};

type CustomerDetails = {
  id: string;
  phoneNumber: string | null;
  dateOfBirth: Date | null;
  status: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  user: {
    name: string | null;
    email: string | null;
  } | null;
};

type CustomerAnalytics =
  | {
      totalAppointments: number;
      completedAppointments: number;
      showRate: number;
      totalRevenue: number;
      aov: number;
      avgRevisitValue: number;
      chartData: Array<{
        month: string;
        appointments: number;
        revenue: number;
        completed: number;
      }>;
    }
  | null
  | undefined;

type CustomerAppointment = {
  id: string;
  startTime: Date;
  endTime: Date;
  status: string;
  paymentStatus: string;
  price: number;
  notes: string | null;
  serviceNames: string[];
  specialistNames: string[];
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount / 100);
};

const formatLabel = (value: string) => {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const formatMonthLabel = (monthKey: string) => {
  const parsedDate = new Date(`${monthKey}-01T00:00:00`);

  if (Number.isNaN(parsedDate.getTime())) {
    return monthKey;
  }

  return format(parsedDate, "MMM yyyy");
};

const getStatusVariant = (status: string) => {
  if (status === "COMPLETED") {
    return "default" as const;
  }

  if (status === "CANCELED" || status === "NO_SHOW") {
    return "destructive" as const;
  }

  return "outline" as const;
};

function CustomerDetailsPageSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="h-10 w-40" />
      </div>

      <div className="space-y-3">
        <div className="grid w-full max-w-3xl grid-cols-2 gap-2 md:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={`tab-skeleton-${index + 1}`} className="h-10 w-full" />
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.3fr_0.9fr]">
          <Card>
            <CardHeader>
              <Skeleton className="h-7 w-56" />
              <Skeleton className="h-4 w-36" />
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {Array.from({ length: 4 }, (_, index) => (
                <div
                  key={`profile-skeleton-${index + 1}`}
                  className="rounded-lg border p-4"
                >
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="mt-3 h-5 w-40" />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Skeleton className="h-7 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              {Array.from({ length: 4 }, (_, index) => (
                <div key={`meta-skeleton-${index + 1}`} className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-5 w-36" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Card key={`insight-skeleton-${index + 1}`}>
              <CardContent className="space-y-3 p-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

type AppointmentListProps = {
  appointments: CustomerAppointment[];
  isLoading: boolean;
  emptyTitle: string;
  emptyDescription: string;
};

type OverviewTabProps = {
  customerDetails: CustomerDetails;
  analytics: CustomerAnalytics;
  analyticsLoading: boolean;
  appointmentsLoading: boolean;
  pastAppointmentCount: number;
};

type InsightsTabProps = {
  analytics: CustomerAnalytics;
  analyticsLoading: boolean;
};

const getCustomerQueryOptions = ({
  customerId,
  locationId,
  isSpecialist,
}: {
  customerId: string;
  locationId: string;
  isSpecialist: boolean;
}) => {
  return {
    details: isSpecialist
      ? trpc.customers.getSpecialistCustomerDetails.queryOptions({
          customerId,
          locationId,
        })
      : trpc.customers.getCustomerDetails.queryOptions({
          customerId,
          locationId,
        }),
    analytics: isSpecialist
      ? trpc.customers.getSpecialistCustomerAnalytics.queryOptions({
          customerId,
          locationId,
        })
      : trpc.customers.getCustomerAnalytics.queryOptions({
          customerId,
          locationId,
        }),
    appointments: isSpecialist
      ? trpc.customers.getSpecialistCustomerAppointments.queryOptions({
          customerId,
          locationId,
        })
      : trpc.customers.getCustomerAppointments.queryOptions({
          customerId,
          locationId,
        }),
  };
};

function OverviewTab({
  customerDetails,
  analytics,
  analyticsLoading,
  appointmentsLoading,
  pastAppointmentCount,
}: Readonly<OverviewTabProps>) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.3fr_0.9fr]">
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
            <CardTitle>Details</CardTitle>
            <CardDescription>Customer lifecycle and internal context</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
              <p className="font-medium text-muted-foreground">
                {customerDetails.notes ?? "No notes available"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Appointments</p>
            {analyticsLoading ? (
              <Skeleton className="mt-3 h-8 w-16" />
            ) : (
              <p className="mt-2 text-2xl font-bold">{analytics?.totalAppointments ?? 0}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Completed</p>
            {analyticsLoading ? (
              <Skeleton className="mt-3 h-8 w-16" />
            ) : (
              <p className="mt-2 text-2xl font-bold">{analytics?.completedAppointments ?? 0}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Past Visits</p>
            {appointmentsLoading ? (
              <Skeleton className="mt-3 h-8 w-16" />
            ) : (
              <p className="mt-2 text-2xl font-bold">{pastAppointmentCount}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Lifetime Revenue</p>
            {analyticsLoading ? (
              <Skeleton className="mt-3 h-8 w-24" />
            ) : (
              <p className="mt-2 text-2xl font-bold">
                {formatCurrency(analytics?.totalRevenue ?? 0)}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function InsightsTab({ analytics, analyticsLoading }: Readonly<InsightsTabProps>) {
  const chartData = analytics?.chartData ?? [];
  const hasChartData = chartData.length > 0;
  const highestAppointments = hasChartData
    ? Math.max(...chartData.map((item) => item.appointments), 1)
    : 1;

  let trendsContent = (
    <div className="flex min-h-52 flex-col items-center justify-center text-center">
      <Calendar className="mb-4 h-12 w-12 text-muted-foreground" />
      <h3 className="text-lg font-semibold">No analytics yet</h3>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Appointment trends will appear here after this customer starts visiting.
      </p>
    </div>
  );

  if (analyticsLoading) {
    trendsContent = <Skeleton className="h-64 w-full" />;
  }

  if (!analyticsLoading && hasChartData) {
    trendsContent = (
      <div className="space-y-4">
        {chartData.map((dataPoint) => (
          <div key={dataPoint.month} className="space-y-2">
            <div className="flex flex-col gap-2 text-sm md:flex-row md:items-center md:justify-between">
              <span className="font-medium">{formatMonthLabel(dataPoint.month)}</span>
              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                <span>{dataPoint.appointments} appointments</span>
                <span>{dataPoint.completed} completed</span>
                <span>{formatCurrency(dataPoint.revenue)}</span>
              </div>
            </div>
            <div className="h-2 rounded-full bg-secondary">
              <div
                className="h-2 rounded-full bg-primary transition-all"
                style={{
                  width: `${Math.min((dataPoint.appointments / highestAppointments) * 100, 100)}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Insights</CardTitle>
          <CardDescription>Customer analytics and appointment metrics</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground">Total Appointments</p>
            {analyticsLoading ? (
              <Skeleton className="mt-3 h-8 w-16" />
            ) : (
              <p className="mt-1 text-2xl font-bold">{analytics?.totalAppointments ?? 0}</p>
            )}
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground">Completed Appointments</p>
            {analyticsLoading ? (
              <Skeleton className="mt-3 h-8 w-16" />
            ) : (
              <p className="mt-1 text-2xl font-bold">{analytics?.completedAppointments ?? 0}</p>
            )}
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground">Show Rate</p>
            {analyticsLoading ? (
              <Skeleton className="mt-3 h-8 w-16" />
            ) : (
              <p className="mt-1 text-2xl font-bold">{analytics?.showRate ?? 0}%</p>
            )}
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground">Total Revenue</p>
            {analyticsLoading ? (
              <Skeleton className="mt-3 h-8 w-24" />
            ) : (
              <p className="mt-1 flex items-center gap-1 text-2xl font-bold">
                <DollarSign className="h-4 w-4" />
                {formatCurrency(analytics?.totalRevenue ?? 0)}
              </p>
            )}
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground">AOV</p>
            {analyticsLoading ? (
              <Skeleton className="mt-3 h-8 w-24" />
            ) : (
              <p className="mt-1 text-2xl font-bold">{formatCurrency(analytics?.aov ?? 0)}</p>
            )}
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground">Avg Revisit Value</p>
            {analyticsLoading ? (
              <Skeleton className="mt-3 h-8 w-24" />
            ) : (
              <p className="mt-1 text-2xl font-bold">
                {formatCurrency(analytics?.avgRevisitValue ?? 0)}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Appointment Trends</CardTitle>
          <CardDescription>Last 12 months of customer activity</CardDescription>
        </CardHeader>
        <CardContent>{trendsContent}</CardContent>
      </Card>
    </div>
  );
}

function AppointmentList({
  appointments,
  isLoading,
  emptyTitle,
  emptyDescription,
}: Readonly<AppointmentListProps>) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }, (_, index) => (
          <Card key={`appointment-skeleton-${index + 1}`}>
            <CardContent className="space-y-4 p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-6 w-24" />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-6 w-24" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (appointments.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-14 text-center">
          <Calendar className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-semibold">{emptyTitle}</h3>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">{emptyDescription}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {appointments.map((appointment) => (
        <Card key={appointment.id}>
          <CardContent className="space-y-4 p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-base font-semibold">
                    {format(appointment.startTime, "EEE, MMM d, yyyy")}
                  </p>
                  <Badge variant={getStatusVariant(appointment.status)}>
                    {formatLabel(appointment.status)}
                  </Badge>
                  <Badge variant="secondary">
                    {formatLabel(appointment.paymentStatus)}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    {format(appointment.startTime, "h:mm a")} - {format(appointment.endTime, "h:mm a")}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <DollarSign className="h-4 w-4" />
                    {formatCurrency(appointment.price)}
                  </span>
                </div>
              </div>

              <div className="space-y-1 text-sm xl:text-right">
                <p className="font-medium text-foreground">Appointment ID</p>
                <p className="text-muted-foreground">{appointment.id}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Services
                </p>
                <div className="flex flex-wrap gap-2">
                  {appointment.serviceNames.length > 0 ? (
                    appointment.serviceNames.map((serviceName) => (
                      <Badge key={`${appointment.id}-${serviceName}`} variant="outline">
                        {serviceName}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No services listed</p>
                  )}
                </div>
              </div>

              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Specialists
                </p>
                <p className="text-sm font-medium">
                  {appointment.specialistNames.length > 0
                    ? appointment.specialistNames.join(", ")
                    : "Unassigned"}
                </p>
              </div>

              {appointment.notes ? (
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Notes
                  </p>
                  <p className="text-sm text-muted-foreground">{appointment.notes}</p>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function CustomerDetailsPageClient({
  slug,
  customerId,
  locationId,
  isSpecialist = false,
}: Readonly<CustomerDetailsPageClientProps>) {
  const queryOptions = getCustomerQueryOptions({
    customerId,
    locationId,
    isSpecialist,
  });

  const { data: customerDetails, isLoading: detailsLoading } = useQuery(
    queryOptions.details,
  );

  const { data: analytics, isLoading: analyticsLoading } = useQuery(
    queryOptions.analytics,
  );

  const { data: appointments = [], isLoading: appointmentsLoading } = useQuery(
    queryOptions.appointments,
  );

  if (detailsLoading) {
    return <CustomerDetailsPageSkeleton />;
  }

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
            <Link
              href={`/dashboard/l/${slug}/customers`}
              className={buttonVariants({ variant: "outline" })}
            >
              Back to Customers
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const now = new Date();
  const pastAppointments = appointments.filter(
    (appointment) => new Date(appointment.startTime) < now,
  );
  const upcomingAppointments = appointments.filter(
    (appointment) => new Date(appointment.startTime) >= now,
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Customer Details</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Full profile, appointment history, and performance insights
          </p>
        </div>
        <Link
          href={`/dashboard/l/${slug}/customers`}
          className={buttonVariants({ variant: "outline" })}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Customers
        </Link>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid h-auto w-full max-w-3xl grid-cols-2 gap-1 md:grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="past-appointments">Past Appointments</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab
            customerDetails={customerDetails as CustomerDetails}
            analytics={analytics as CustomerAnalytics}
            analyticsLoading={analyticsLoading}
            appointmentsLoading={appointmentsLoading}
            pastAppointmentCount={pastAppointments.length}
          />
        </TabsContent>

        <TabsContent value="past-appointments" className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Past Appointments</h2>
            <p className="text-sm text-muted-foreground">
              Review completed, canceled, and prior customer visits in one place.
            </p>
          </div>
          <AppointmentList
            appointments={pastAppointments}
            isLoading={appointmentsLoading}
            emptyTitle="No past appointments yet"
            emptyDescription="Once this customer completes or misses appointments, they will show up here."
          />
        </TabsContent>

        <TabsContent value="upcoming" className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Upcoming Appointments</h2>
            <p className="text-sm text-muted-foreground">
              Keep track of scheduled visits and the services planned next.
            </p>
          </div>
          <AppointmentList
            appointments={upcomingAppointments}
            isLoading={appointmentsLoading}
            emptyTitle="No upcoming appointments scheduled"
            emptyDescription="New bookings for this customer will appear here automatically."
          />
        </TabsContent>

        <TabsContent value="insights">
          <InsightsTab
            analytics={analytics as CustomerAnalytics}
            analyticsLoading={analyticsLoading}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
