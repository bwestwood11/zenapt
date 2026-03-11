"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
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
import { trpc } from "@/utils/trpc";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { parseAsString, useQueryState } from "nuqs";
import { CalendarDays } from "lucide-react";

type AppointmentStatus =
  | "SCHEDULED"
  | "COMPLETED"
  | "NO_SHOW"
  | "CANCELED"
  | "RESCHEDULED";

type KanbanAppointment = {
  id: string;
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
      const cappedEnd = new Date(
        Math.min(weekEnd.getTime(), maxEnd.getTime()),
      );

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
    trpc.appointment.fetchAppointments.queryOptions(
      rangeConfig.input,
      {
        enabled: Boolean(locationId),
      },
    ),
  );

  const appointments = useMemo(() => {
    const allAppointments = Object.values(data ?? {}).flat() as KanbanAppointment[];

    return [...allAppointments].sort(
      (a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    );
  }, [data]);

  const grouped = useMemo(() => {
    return STATUS_COLUMNS.reduce<Record<AppointmentStatus, KanbanAppointment[]>>(
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
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Appointments</h1>
          <p className="text-sm text-muted-foreground">
            Read-only table and kanban views
          </p>
        </div>

        <div className="w-full max-w-sm rounded-lg border bg-card p-3">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            Date Range
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
              <Badge variant="outline" className="font-normal">
                From: {formatDateWithYear(rangeConfig.fromDate)}
              </Badge>
              <Badge variant="outline" className="font-normal">
                To: {formatDateWithYear(rangeConfig.toDate)}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2">
        <p className="text-sm text-muted-foreground">
          Showing: <span className="font-medium text-foreground">{rangeConfig.label}</span>
        </p>
        <Badge variant="secondary">{appointments.length} Appointments</Badge>
      </div>

      {isError ? (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">
            Unable to load appointments right now.
          </CardContent>
        </Card>
      ) : null}

      <Tabs defaultValue="table" className="space-y-4">
        <TabsList>
          <TabsTrigger value="table">Table</TabsTrigger>
          <TabsTrigger value="kanban">Kanban</TabsTrigger>
        </TabsList>

        <TabsContent value="table">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Appointments (Read-only)</CardTitle>
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
                    <TableHead className="text-right">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading
                    ? Array.from({ length: 8 }, (_, idx) => (
                        <TableRow key={`table-skeleton-${idx}`}>
                          <TableCell><Skeleton className="h-4 w-[90px]" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-[160px]" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-[220px]" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-[140px]" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                          <TableCell><Skeleton className="ml-auto h-4 w-[70px]" /></TableCell>
                        </TableRow>
                      ))
                    : null}

                  {!isLoading && appointments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        No appointments
                      </TableCell>
                    </TableRow>
                  ) : null}

                  {isLoading
                    ? null
                    : appointments.map((appointment) => (
                        <TableRow key={appointment.id}>
                          <TableCell className="text-muted-foreground">
                            {formatDate(appointment.startTime)}
                          </TableCell>
                          <TableCell className="font-medium">
                            {appointment.customer.name ?? "Unknown customer"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {appointment.service.map((service) => service.name).join(", ")}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatTime(appointment.startTime)} - {formatTime(appointment.endTime)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{formatStatus(appointment.status)}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Link
                              href={`/dashboard/l/${slug}/appointments/${appointment.id}`}
                              className="text-sm text-primary hover:underline"
                            >
                              View
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="kanban">
          <div className="grid gap-4 lg:grid-cols-5">
            {STATUS_COLUMNS.map((column) => {
              const items = grouped[column.key];

              return (
                <Card key={column.key} className="min-h-[420px]">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between text-base">
                      <span>{column.title}</span>
                      <Badge variant="secondary">{items.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {isLoading
                      ? Array.from({ length: 4 }, (_, idx) => (
                          <div key={`${column.key}-skeleton-${idx}`} className="space-y-2 rounded-md border p-3">
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
                          <div key={appointment.id} className="space-y-2 rounded-md border p-3">
                            <div className="font-medium">
                              {appointment.customer.name ?? "Unknown customer"}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {appointment.service.map((service) => service.name).join(", ")}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatTime(appointment.startTime)} - {formatTime(appointment.endTime)}
                            </p>
                            <Link
                              href={`/dashboard/l/${slug}/appointments/${appointment.id}`}
                              className="inline-block text-xs font-medium text-primary hover:underline"
                            >
                              View details
                            </Link>
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
