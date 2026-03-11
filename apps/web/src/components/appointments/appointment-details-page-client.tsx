"use client";

import Link from "next/link";
import { ArrowLeft, CalendarDays, Clock, Mail, Phone, User } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/utils/trpc";

type AppointmentDetailsPageClientProps = {
  slug: string;
  locationId: string;
  appointmentId: string;
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount / 100);
};

const formatDateTime = (value: Date, timeZone?: string | null) => {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: timeZone ?? "UTC",
  }).format(new Date(value));
};

const formatStatus = (status: string) =>
  status
    .toLowerCase()
    .replaceAll("_", " ")
    .replaceAll(/\b\w/g, (char) => char.toUpperCase());

export default function AppointmentDetailsPageClient({
  slug,
  locationId,
  appointmentId,
}: Readonly<AppointmentDetailsPageClientProps>) {
  const { data: appointment, isLoading } = useQuery(
    trpc.appointment.getAppointmentDetails.queryOptions({
      locationId,
      appointmentId,
    }),
  );

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-56" />
        <Card>
          <CardContent className="space-y-3 py-6">
            <Skeleton className="h-5 w-64" />
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-5 w-72" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Appointment not found</CardTitle>
            <CardDescription>
              The requested appointment is unavailable for this location.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild>
              <Link href={`/dashboard/l/${slug}/appointments`}>Back to Appointments</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const discountAmount = Math.max(0, appointment.discountAmountApplied ?? 0);
  const finalAmount = Math.max(0, appointment.price - discountAmount);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Appointment Details</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Full details for appointment {appointment.id}
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/dashboard/l/${slug}/appointments`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Appointments
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            Schedule
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Start</p>
            <p className="font-medium">
              {formatDateTime(appointment.startTime, appointment.location.timeZone)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">End</p>
            <p className="font-medium">
              {formatDateTime(appointment.endTime, appointment.location.timeZone)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Status</p>
            <Badge variant="secondary">{formatStatus(appointment.status)}</Badge>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Payment Status</p>
            <Badge variant="secondary">{formatStatus(appointment.paymentStatus)}</Badge>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Buffer Time</p>
            <p className="font-medium">{appointment.bufferTime} mins</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Prep Time</p>
            <p className="font-medium">{appointment.prepTime} mins</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Created</p>
            <p className="font-medium">
              {formatDateTime(appointment.createdAt, appointment.location.timeZone)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Updated</p>
            <p className="font-medium">
              {formatDateTime(appointment.updatedAt, appointment.location.timeZone)}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            Customer
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">Name</p>
            <p className="font-medium">{appointment.customer.user?.name ?? "N/A"}</p>
          </div>
          <div className="flex items-start gap-2">
            <Mail className="mt-0.5 h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="font-medium">{appointment.customer.user?.email ?? "N/A"}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Phone className="mt-0.5 h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Phone</p>
              <p className="font-medium">{appointment.customer.phoneNumber ?? "N/A"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Services & Add-ons</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {appointment.service.map((service) => (
              <div
                key={service.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3"
              >
                <div>
                  <p className="font-medium">{service.serviceTerms.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {service.duration} mins
                    {service.locationEmployee?.user?.name
                      ? ` • ${service.locationEmployee.user.name}`
                      : ""}
                  </p>
                </div>
                <Badge variant="outline">{formatCurrency(service.price)}</Badge>
              </div>
            ))}
          </div>

          {appointment.addOns.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">Add-ons</p>
              {appointment.addOns.map((addOn) => (
                <div
                  key={addOn.id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <p className="text-sm">{addOn.name}</p>
                  <Badge variant="outline">{formatCurrency(addOn.basePrice)}</Badge>
                </div>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            Billing Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-xl font-semibold">{formatCurrency(appointment.price)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Discount</p>
            <p className="text-xl font-semibold">-{formatCurrency(discountAmount)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Final Amount</p>
            <p className="text-xl font-semibold">{formatCurrency(finalAmount)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Card</p>
            <p className="text-xl font-semibold">
              {appointment.paymentMethodLast4
                ? `•••• ${appointment.paymentMethodLast4}`
                : "No card on file"}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
