"use client";

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
import { useQuery } from "@tanstack/react-query";
import {
  CalendarCheck2,
  CalendarDays,
  Clock,
  ListChecks,
  Settings,
  Sparkles,
  UserRound,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import {
  getDateKeyInTimeZone,
  shiftDateKey,
} from "@/components/calendar/timezone";

const formatDateTime = (date: Date, timeZone: string) =>
  new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);

const formatTime = (date: Date, timeZone: string) =>
  new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(date);

type SpecialistDashboardClientProps = {
  locationId: string;
  slug: string;
  role: string;
};

type SpecialistAppointment = {
  id: string;
  startTime: Date;
  endTime: Date;
  customerName: string;
  serviceNames: string[];
};

const getNextAppointmentSummary = (
  isLoading: boolean,
  timeZone: string,
  appointment?: SpecialistAppointment,
) => {
  if (isLoading) {
    return { title: "Loading...", subtitle: "" };
  }

  if (!appointment) {
    return {
      title: "No upcoming appointments",
      subtitle: "You are clear for now",
    };
  }

  return {
    title: formatDateTime(new Date(appointment.startTime), timeZone),
    subtitle: appointment.customerName,
  };
};

const getFocusSummary = (isLoading: boolean, todayAppointmentsCount: number) => {
  if (isLoading) {
    return { title: "--", subtitle: "Preparing insights" };
  }

  if (todayAppointmentsCount > 0) {
    const suffix = todayAppointmentsCount > 1 ? "s" : "";
    return {
      title: "Today is active",
      subtitle: `You have ${todayAppointmentsCount} appointment${suffix} left today`,
    };
  }

  return {
    title: "Open capacity today",
    subtitle: "Great window for follow-ups and prep",
  };
};

const renderUpcomingAppointments = (
  isLoading: boolean,
  timeZone: string,
  appointments: SpecialistAppointment[],
) => {
  if (isLoading) {
    return (
      <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
        Loading appointments...
      </div>
    );
  }

  if (appointments.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
        No upcoming appointments found.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {appointments.slice(0, 8).map((appointment) => {
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
                {formatDateTime(start, timeZone)} • {formatTime(start, timeZone)} -{" "}
                {formatTime(end, timeZone)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const renderTodayAppointments = (
  isLoading: boolean,
  timeZone: string,
  todayAppointments: SpecialistAppointment[],
) => {
  if (isLoading) {
    return (
      <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
        Loading schedule...
      </div>
    );
  }

  if (todayAppointments.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
        No appointments remaining today.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {todayAppointments.slice(0, 5).map((appointment) => {
        const start = new Date(appointment.startTime);
        const end = new Date(appointment.endTime);

        return (
          <div
            key={appointment.id}
            className="rounded-md border p-3 flex items-center justify-between gap-3"
          >
            <div>
              <p className="font-medium">{appointment.customerName}</p>
              <p className="text-sm text-muted-foreground capitalize">
                {appointment.serviceNames.join(", ")}
              </p>
            </div>
            <p className="text-sm text-muted-foreground whitespace-nowrap">
              {formatTime(start, timeZone)} - {formatTime(end, timeZone)}
            </p>
          </div>
        );
      })}
    </div>
  );
};

export default function SpecialistDashboardClient({
  locationId,
  slug,
  role,
}: Readonly<SpecialistDashboardClientProps>) {
  const now = useMemo(() => new Date(), []);
  const rangeEnd = useMemo(
    () => new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
    [now],
  );

  const {
    data: upcomingData,
    isLoading,
    isError,
  } = useQuery(
    trpc.appointment.fetchSpecialistUpcomingAppointments.queryOptions({
      locationId,
      startDate: now,
      endDate: rangeEnd,
    }),
  );

  const locationTimeZone = upcomingData?.timeZone ?? "UTC";
  const todayDateKey = useMemo(
    () => getDateKeyInTimeZone(now, locationTimeZone),
    [locationTimeZone, now],
  );
  const tomorrowDateKey = useMemo(
    () => shiftDateKey(todayDateKey, 1),
    [todayDateKey],
  );

  const upcomingAppointments = useMemo(() => {
    return (upcomingData?.appointments ?? [])
      .filter((appointment) => new Date(appointment.startTime) >= now)
      .sort(
        (a, b) =>
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
      );
  }, [upcomingData?.appointments, now]) as SpecialistAppointment[];

  const todayAppointmentsCount = useMemo(() => {
    return upcomingAppointments.filter((appointment) => {
      const startsAt = new Date(appointment.startTime);
      return getDateKeyInTimeZone(startsAt, locationTimeZone) === todayDateKey;
    }).length;
  }, [upcomingAppointments, locationTimeZone, todayDateKey]);

  const tomorrowAppointmentsCount = useMemo(() => {
    return upcomingAppointments.filter((appointment) => {
      const startsAt = new Date(appointment.startTime);
      return getDateKeyInTimeZone(startsAt, locationTimeZone) === tomorrowDateKey;
    }).length;
  }, [upcomingAppointments, locationTimeZone, tomorrowDateKey]);

  const uniqueCustomersCount = useMemo(() => {
    return new Set(
      upcomingAppointments.map((appointment) => appointment.customerName),
    ).size;
  }, [upcomingAppointments]);

  const servicesCount = useMemo(() => {
    const services = upcomingAppointments.flatMap(
      (appointment) => appointment.serviceNames,
    );
    return new Set(services).size;
  }, [upcomingAppointments]);

  const todayAppointments = useMemo(() => {
    return upcomingAppointments
      .filter((appointment) => {
        const startsAt = new Date(appointment.startTime);
        return getDateKeyInTimeZone(startsAt, locationTimeZone) === todayDateKey;
      })
      .sort(
        (a, b) =>
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
      );
  }, [upcomingAppointments, locationTimeZone, todayDateKey]);

  const nextAppointmentSummary = getNextAppointmentSummary(
    isLoading,
    locationTimeZone,
    upcomingAppointments[0],
  );
  const focusSummary = getFocusSummary(isLoading, todayAppointmentsCount);
  const appointmentsContent = renderUpcomingAppointments(
    isLoading,
    locationTimeZone,
    upcomingAppointments,
  );
  const todayScheduleContent = renderTodayAppointments(
    isLoading,
    locationTimeZone,
    todayAppointments,
  );

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
            <CardTitle className="text-base">{nextAppointmentSummary.title}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {nextAppointmentSummary.subtitle}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <CalendarCheck2 className="h-4 w-4" /> Tomorrow
            </CardDescription>
            <CardTitle className="text-2xl">
              {isLoading ? "--" : tomorrowAppointmentsCount}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Planned for tomorrow
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Users className="h-4 w-4" /> Unique customers
            </CardDescription>
            <CardTitle className="text-2xl">
              {isLoading ? "--" : uniqueCustomersCount}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Across upcoming appointments
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <ListChecks className="h-4 w-4" /> Services
            </CardDescription>
            <CardTitle className="text-2xl">
              {isLoading ? "--" : servicesCount}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Service types in next 7 days
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" /> Focus
            </CardDescription>
            <CardTitle className="text-base">{focusSummary.title}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {focusSummary.subtitle}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" /> Today's Schedule
            </CardTitle>
            <CardDescription>What remains on your schedule today</CardDescription>
          </CardHeader>
          <CardContent>{todayScheduleContent}</CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" /> Specialist Quick Links
            </CardTitle>
            <CardDescription>
              Common specialist actions for this location
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Link href={`/dashboard/l/${slug}/calendar`}>
              <Button variant="outline" className="w-full justify-start">
                Open Calendar
              </Button>
            </Link>
            <Link href={`/dashboard/l/${slug}/my-services`}>
              <Button variant="outline" className="w-full justify-start">
                Manage My Services
              </Button>
            </Link>
            <Link href={`/dashboard/l/${slug}/my-working-hours`}>
              <Button variant="outline" className="w-full justify-start">
                Manage My Working Hours
              </Button>
            </Link>
            <Link href={`/dashboard/l/${slug}/customers`}>
              <Button variant="outline" className="w-full justify-start">
                View Customers
              </Button>
            </Link>
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
