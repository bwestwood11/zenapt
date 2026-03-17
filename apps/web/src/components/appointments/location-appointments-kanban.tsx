"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { parseAsString, useQueryState } from "nuqs";
import {
  ArrowRight,
  CalendarDays,
  LayoutGrid,
  Table2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { trpc } from "@/utils/trpc";

type AppointmentStatus =
  | "SCHEDULED"
  | "COMPLETED"
  | "NO_SHOW"
  | "CANCELED"
  | "RESCHEDULED";

type KanbanAppointment = {
  id: string;
  employeeId: string;
  startTime: Date;
  endTime: Date;
  customer: {
    name: string | null;
    id: string;
  };
  service: Array<{
    id: string;
    name: string;
    duration: number;
  }>;
  status: AppointmentStatus;
};

type AppointmentRange = "today" | "tomorrow" | "week" | "next7";

const STATUS_COLUMNS: Array<{
  key: AppointmentStatus;
  title: string;
}> = [
  { key: "SCHEDULED", title: "Scheduled" },
  { key: "RESCHEDULED", title: "Rescheduled" },
  { key: "COMPLETED", title: "Completed" },
  { key: "NO_SHOW", title: "No Show" },
  { key: "CANCELED", title: "Canceled" },
];

const getTodayDateKey = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const getStartOfToday = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

const getEndOfWeek = (date: Date) => {
  const day = date.getDay();
  const daysUntilSunday = (7 - day) % 7;
  return addDays(date, daysUntilSunday);
};

const formatDate = (value: Date) => {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
};

const formatTime = (value: Date) => {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
};

const formatStatus = (status: AppointmentStatus) =>
  status
    .toLowerCase()
    .replaceAll("_", " ")
    .replaceAll(/\b\w/g, (char) => char.toUpperCase());

const getStatusBadgeClassName = (status: AppointmentStatus) => {
  switch (status) {
    case "COMPLETED":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300";
    case "CANCELED":
      return "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300";
    case "RESCHEDULED":
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300";
    case "NO_SHOW":
      return "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300";
    default:
      return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300";
  }
};

export function LocationAppointmentsKanban({
  locationId,
  slug,
}: Readonly<{ locationId: string; slug: string }>) {
  const [range, setRange] = useQueryState(
    "range",
    parseAsString.withDefault("today"),
  );

  const selectedRange = (range as AppointmentRange) || "today";

  const rangeConfig = useMemo(() => {
    const todayStart = getStartOfToday();

    if (selectedRange === "tomorrow") {
      const tomorrow = addDays(todayStart, 1);
      return {
        input: { locationId, dateKey: getTodayDateKeyFromDate(tomorrow) },
        label: "Tomorrow",
        fromDate: tomorrow,
        toDate: tomorrow,
      } as const;
    }

    if (selectedRange === "week") {
      const weekEnd = getEndOfWeek(todayStart);
      const maxEnd = addDays(todayStart, 6);
      const cappedEnd = new Date(Math.min(weekEnd.getTime(), maxEnd.getTime()));

      return {
        input: {
          locationId,
          startDate: todayStart,
          endDate: cappedEnd,
        },
        label: "This Week",
        fromDate: todayStart,
        toDate: cappedEnd,
      } as const;
    }

    if (selectedRange === "next7") {
      const nextSevenEnd = addDays(todayStart, 6);
      return {
        input: {
          locationId,
          startDate: todayStart,
          endDate: nextSevenEnd,
        },
        label: "Next 7 Days",
        fromDate: todayStart,
        toDate: nextSevenEnd,
      } as const;
    }

    return {
      input: { locationId, dateKey: getTodayDateKey() },
      label: "Today",
      fromDate: todayStart,
      toDate: todayStart,
    } as const;
  }, [locationId, selectedRange]);

  const { data, isLoading, isError } = useQuery(
    trpc.appointment.fetchAppointments.queryOptions(rangeConfig.input, {
      enabled: Boolean(locationId),
    }),
  );

  const appointments = useMemo(() => {
    const allAppointments = Object.values(
      data ?? {},
    ).flat() as KanbanAppointment[];

    return [...allAppointments].sort(
      (a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    );
  }, [data]);

  const grouped = useMemo(() => {
    return STATUS_COLUMNS.reduce<
      Record<AppointmentStatus, KanbanAppointment[]>
    >(
      (acc, column) => {
        acc[column.key] = appointments.filter(
          (appointment) => appointment.status === column.key,
        );
        return acc;
      },
      {
        SCHEDULED: [],
        RESCHEDULED: [],
        COMPLETED: [],
        NO_SHOW: [],
        CANCELED: [],
      },
    );
  }, [appointments]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-primary">Appointments</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Appointments</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Focus on the appointment table, then jump directly to customer and service records from each row.
          </p>
        </div>

        <div className="w-full max-w-md rounded-2xl border bg-card/80 p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              Filter by date
            </div>
            <Badge variant="secondary" className="rounded-full px-3 py-1">
              {appointments.length} appointments
            </Badge>
          </div>
          <div className="space-y-2">
            <Select
              value={selectedRange}
              onValueChange={(value) => setRange(value as AppointmentRange)}
            >
              <SelectTrigger id="appointments-range">
                <SelectValue placeholder="Select range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="tomorrow">Tomorrow</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="next7">Next 7 Days</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Badge variant="outline" className="rounded-full font-normal">
                {rangeConfig.label}
              </Badge>
              <Badge variant="outline" className="rounded-full font-normal">
                From: {formatDateWithYear(rangeConfig.fromDate)}
              </Badge>
              <Badge variant="outline" className="rounded-full font-normal">
                To: {formatDateWithYear(rangeConfig.toDate)}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-2xl border bg-muted/30 px-4 py-3">
        <div>
          <p className="text-sm font-medium text-foreground">Main view: Table</p>
          <p className="text-sm text-muted-foreground">
            The table stays primary. Use kanban only when you want a quick status board.
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          Filter updates the full list
        </div>
      </div>

      {isError ? (
        <Card className="shadow-sm">
          <CardContent className="py-8 text-sm text-muted-foreground">
            Unable to load appointments right now.
          </CardContent>
        </Card>
      ) : null}

      <Tabs defaultValue="table" className="space-y-4">
        <TabsList className="h-auto rounded-2xl p-1">
          <TabsTrigger value="table" className="gap-2">
            <Table2 className="h-4 w-4" />
            Table
          </TabsTrigger>
          <TabsTrigger value="kanban" className="gap-2">
            <LayoutGrid className="h-4 w-4" />
            Kanban
          </TabsTrigger>
        </TabsList>

        <TabsContent value="table">
          <Card className="border-none shadow-md">
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle className="text-base">Appointment Table</CardTitle>
                <Badge variant="outline" className="rounded-full font-normal">
                  {rangeConfig.label}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Services</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading
                    ? Array.from({ length: 8 }, (_, idx) => (
                        <TableRow key={`table-skeleton-${idx}`}>
                          <TableCell>
                            <Skeleton className="h-4 w-[90px]" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-[160px]" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-[220px]" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-[140px]" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-[100px]" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="ml-auto h-4 w-[70px]" />
                          </TableCell>
                        </TableRow>
                      ))
                    : null}

                  {!isLoading && appointments.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="h-24 text-center text-muted-foreground"
                      >
                        No appointments
                      </TableCell>
                    </TableRow>
                  ) : null}

                  {isLoading
                    ? null
                    : appointments.map((appointment) => (
                        <TableRow key={appointment.id} className="hover:bg-muted/30">
                          <TableCell>
                            <div className="space-y-1">
                              <p className="font-medium text-foreground">
                                {formatDate(appointment.startTime)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatTime(appointment.startTime)} - {formatTime(appointment.endTime)}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-2">
                              <p className="font-medium text-foreground">
                                {appointment.customer.name ?? "Unknown customer"}
                              </p>
                              <Link
                                href={`/dashboard/l/${slug}/customers/${appointment.customer.id}`}
                                className={cn(
                                  buttonVariants({ variant: "ghost", size: "sm" }),
                                  "h-7 justify-start px-0 text-primary hover:text-primary/90",
                                )}
                              >
                                Open customer
                                <ArrowRight className="ml-1 h-3.5 w-3.5" />
                              </Link>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-2">
                              {appointment.service.map((service) => (
                                <Link
                                  key={service.id}
                                  href="/dashboard/services"
                                  className={cn(
                                    buttonVariants({ variant: "outline", size: "sm" }),
                                    "h-7 rounded-full px-3 text-xs",
                                  )}
                                  title={`Open services and look up ${service.name}`}
                                >
                                  {service.name}
                                </Link>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {appointment.service
                              .map((service) => `${service.duration}m`)
                              .join(" • ")}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={cn("border", getStatusBadgeClassName(appointment.status))}
                            >
                              {formatStatus(appointment.status)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Link
                                href={`/dashboard/l/${slug}/customers/${appointment.customer.id}`}
                                className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-8")}
                              >
                                Customer
                              </Link>
                              <Link
                                href={`/dashboard/l/${slug}/appointments/${appointment.id}`}
                                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-8")}
                              >
                                Details
                              </Link>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="kanban">
          <div className="mb-3 text-sm text-muted-foreground">
            Secondary view for quick status scanning.
          </div>
          <div className="grid gap-4 lg:grid-cols-5">
            {STATUS_COLUMNS.map((column) => {
              const items = grouped[column.key];

              return (
                <Card key={column.key} className="min-h-[420px] rounded-2xl shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between text-base">
                      <span>{column.title}</span>
                      <Badge
                        variant="outline"
                        className={cn("border", getStatusBadgeClassName(column.key))}
                      >
                        {items.length}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {isLoading
                      ? Array.from({ length: 4 }, (_, idx) => (
                          <div
                            key={`${column.key}-skeleton-${idx}`}
                            className="space-y-2 rounded-md border p-3"
                          >
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-3 w-1/2" />
                            <Skeleton className="h-3 w-2/3" />
                          </div>
                        ))
                      : null}

                    {!isLoading && items.length === 0 ? (
                      <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                        No appointments
                      </div>
                    ) : null}

                    {isLoading
                      ? null
                      : items.map((appointment) => (
                          <div
                            key={appointment.id}
                            className="space-y-3 rounded-2xl border bg-background/70 p-4 shadow-sm"
                          >
                            <div className="font-medium">
                              {appointment.customer.name ?? "Unknown customer"}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {appointment.service.map((service) => (
                                <Link
                                  key={service.id}
                                  href="/dashboard/services"
                                  className="inline-flex rounded-full border px-2.5 py-1 text-xs text-foreground transition-colors hover:bg-muted"
                                >
                                  {service.name}
                                </Link>
                              ))}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {formatTime(appointment.startTime)} - {formatTime(appointment.endTime)}
                            </p>
                            <div className="flex flex-wrap gap-2 pt-1">
                              <Link
                                href={`/dashboard/l/${slug}/customers/${appointment.customer.id}`}
                                className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-7 px-2")}
                              >
                                Customer
                              </Link>
                              <Link
                                href={`/dashboard/l/${slug}/appointments/${appointment.id}`}
                                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-7 px-2")}
                              >
                                View details
                              </Link>
                            </div>
                          </div>
                        ))}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function getTodayDateKeyFromDate(value: Date) {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateWithYear(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}
