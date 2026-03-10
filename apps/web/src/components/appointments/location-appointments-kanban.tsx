"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/utils/trpc";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { parseAsString, useQueryState } from "nuqs";

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

const formatTime = (value: Date) => {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
};

export function LocationAppointmentsKanban({
  locationId,
}: Readonly<{ locationId: string }>) {
  const [dateKey, setDateKey] = useQueryState(
    "date",
    parseAsString.withDefault(getTodayDateKey()),
  );

  const { data, isLoading, isError } = useQuery(
    trpc.appointment.fetchAppointments.queryOptions(
      {
        locationId,
        dateKey,
      },
      {
        enabled: Boolean(dateKey),
      },
    ),
  );

  const appointments = useMemo(() => {
    const dateAppointments = (data?.[dateKey] ?? []) as KanbanAppointment[];

    return [...dateAppointments].sort(
      (a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    );
  }, [data, dateKey]);

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
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Appointments</h1>
          <p className="text-sm text-muted-foreground">
            Kanban view by appointment status
          </p>
        </div>

        <div className="w-full max-w-xs space-y-1">
          <label htmlFor="appointments-date" className="text-sm font-medium">
            Date
          </label>
          <Input
            id="appointments-date"
            type="date"
            value={dateKey}
            onChange={(event) => {
              setDateKey(event.target.value);
            }}
          />
        </div>
      </div>

      {isError ? (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">
            Unable to load appointments right now.
          </CardContent>
        </Card>
      ) : null}

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
                      </div>
                    ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
