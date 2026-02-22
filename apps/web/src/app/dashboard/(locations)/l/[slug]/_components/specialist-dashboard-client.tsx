"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { trpc } from "@/utils/trpc";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Clock, UserRound } from "lucide-react";
import { useMemo } from "react";

const formatDateTime = (date: Date) =>
  new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);

const formatTime = (date: Date) =>
  new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);

type SpecialistDashboardClientProps = {
  locationId: string;
  role: string;
};

export default function SpecialistDashboardClient({
  locationId,
  role,
}: SpecialistDashboardClientProps) {
  const now = new Date();

  const startOfToday = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  const endOfToday = useMemo(() => {
    const date = new Date();
    date.setHours(23, 59, 59, 999);
    return date;
  }, []);

  const rangeEnd = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date;
  }, []);

  const {
    data: upcomingData,
    isLoading,
    isError,
  } = useQuery(
    trpc.appointment.fetchSpecialistUpcomingAppointments.queryOptions({
      locationId,
      startDate: startOfToday,
      endDate: rangeEnd,
    }),
  );

  const upcomingAppointments = useMemo(() => {
    return (upcomingData ?? [])
      .filter((appointment) => new Date(appointment.startTime) >= now)
      .sort(
        (a, b) =>
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
      );
  }, [upcomingData, now]);

  const todayAppointmentsCount = useMemo(() => {
    return upcomingAppointments.filter((appointment) => {
      const startsAt = new Date(appointment.startTime);
      return startsAt >= startOfToday && startsAt <= endOfToday;
    }).length;
  }, [upcomingAppointments, startOfToday, endOfToday]);

  const nextAppointment = upcomingAppointments[0];
  let nextAppointmentTitle = "No upcoming appointments";
  let nextAppointmentSubtitle = "You are clear for now";

  if (isLoading) {
    nextAppointmentTitle = "Loading...";
    nextAppointmentSubtitle = "";
  } else if (nextAppointment) {
    nextAppointmentTitle = formatDateTime(new Date(nextAppointment.startTime));
    nextAppointmentSubtitle = nextAppointment.customerName;
  }

  let appointmentsContent: React.ReactNode;
  if (isLoading) {
    appointmentsContent = (
      <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
        Loading appointments...
      </div>
    );
  } else if (upcomingAppointments.length === 0) {
    appointmentsContent = (
      <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
        No upcoming appointments found.
      </div>
    );
  } else {
    appointmentsContent = (
      <div className="space-y-3">
        {upcomingAppointments.slice(0, 8).map((appointment) => {
          const start = new Date(appointment.startTime);
          const end = new Date(appointment.endTime);

          return (
            <div
              key={appointment.id}
              className="rounded-md border p-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between"
            >
              <div className="space-y-1">
                <div className="font-medium flex items-center gap-2">
                  <UserRound className="h-4 w-4" />
                  {appointment.customerName}
                </div>
                <p className="text-sm text-muted-foreground capitalize">
                  {appointment.serviceNames.join(", ")}
                </p>
              </div>
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>
                  {formatDateTime(start)} • {formatTime(start)} - {formatTime(end)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Location Dashboard</h1>
          <p className="text-muted-foreground capitalize">
            Role: {role.replaceAll("_", " ").toLowerCase()}
          </p>
        </div>
        <Badge variant="secondary" className="capitalize">
          Specialist view
        </Badge>
      </div>

      {isError ? (
        <Card>
          <CardHeader>
            <CardTitle>Appointments unavailable</CardTitle>
            <CardDescription>
              Could not load your appointments right now. Please try again.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Upcoming (7 days)</CardDescription>
            <CardTitle className="text-2xl">
              {isLoading ? "--" : upcomingAppointments.length}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Appointments assigned to you
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Today</CardDescription>
            <CardTitle className="text-2xl">
              {isLoading ? "--" : todayAppointmentsCount}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Remaining for today
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Next appointment</CardDescription>
            <CardTitle className="text-base">{nextAppointmentTitle}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {nextAppointmentSubtitle}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" /> Upcoming Appointments
          </CardTitle>
          <CardDescription>
            Your upcoming bookings for the next 7 days
          </CardDescription>
        </CardHeader>
        <CardContent>
          {appointmentsContent}
        </CardContent>
      </Card>
    </>
  );
}
