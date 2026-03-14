"use client";

import {
  closestCorners,
  DndContext,
  DragOverlay,
  PointerSensor,
  useDndContext,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useQueryState } from "nuqs";
import { AbsentEmployeeColumn, EmployeeColumn } from "./employee-column";
import { AppointmentChargeModalProvider } from "./appointment";
import { Header } from "./header";
import { TimeColumn } from "./timeCol";
import { EditSheet } from "./sheet";
import type {
  Appointment,
  DragData,
  DropData,
  Employee,
  WorkingEmployee,
} from "./types";
import { AppointmentProvider, useAppointmentStore } from "./store/appointments";
import { formatMinutes, minutesTo12Hour } from "./utils";
import { ROW_HEIGHT, SLOT_MINUTES } from "./constants";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Skeleton } from "../ui/skeleton";
import { trpc } from "@/utils/trpc";
import LocationOff from "./location-off";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../../server/src/routers";
import {
  confirmAppointment,
  ConfirmAppointmentProvider,
} from "./confirm-modal";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { CalendarIcon, ChevronLeft, ChevronRight, Clock3 } from "lucide-react";
import { Calendar } from "../ui/calendar";
import { add, format, sub } from "date-fns";
import { AddAppointmentDialog } from "./add-appointment-modal";
import { toast } from "sonner";
import { CalendarSettings } from "./settings-popover";
import { authClient } from "@/lib/auth-client";
import {
  dateFromDayMinutesInTimeZone,
  dateKeyToDateInTimeZone,
  dateToMinutesInTimeZone,
  getDateKeyInTimeZone,
  shiftDateKey,
} from "./timezone";

/* ───────────────────────── helpers ───────────────────────── */
const dateToString = (date: Date) => {
  if (Number.isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const parseLocalDate = (value: string): Date | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const [, y, m, d] = match.map(Number);
  const date = new Date(y, m - 1, d);

  return date.getFullYear() === y &&
    date.getMonth() === m - 1 &&
    date.getDate() === d
    ? date
    : null;
};

const useSelectedDate = () =>
  useQueryState("date", {
    defaultValue: dateToString(new Date()),
  });

/* ───────────────────────── context ───────────────────────── */

type LocationHours = { minTime: number; maxTime: number };

const LocationHoursContext = createContext<LocationHours | null>(null);

export const useLocationHours = () => {
  const ctx = useContext(LocationHoursContext);
  if (!ctx) throw new Error("LocationHoursProvider missing");
  return ctx;
};

const findActorEmployee = (employees: Employee[], currentUserId?: string) => {
  if (!currentUserId) return null;

  const actorAtLocation = employees.find((employee) => {
    if (!("employee" in employee)) return false;
    const employeeData = employee.employee as { id: string; userId?: string };
    return (
      employeeData.id === currentUserId || employeeData.userId === currentUserId
    );
  });

  if (!actorAtLocation || !("employee" in actorAtLocation)) return null;
  return actorAtLocation;
};

/* ───────────────────────── master calendar ───────────────────────── */

export function DatePicker({
  onDateChange,
  date,
}: Readonly<{
  date: Date;
  onDateChange: (newDate: Date) => void;
}>) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="min-w-[240px] h-11 justify-between px-4 rounded-lg border-stone-300 hover:bg-stone-50 hover:border-stone-400 transition-all shadow-sm bg-transparent"
        >
          <div className="flex items-center gap-3">
            <CalendarIcon className="w-4 h-4 text-stone-500" />
            <span className="text-[15px] font-medium text-stone-900">
              {format(date, "EEEE, MMMM dd, yyyy")}
            </span>
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto overflow-hidden p-0" align="start">
        <Calendar
          mode="single"
          startMonth={sub(new Date(), { months: 12 })}
          endMonth={add(new Date(), { months: 12 })}
          selected={date}
          captionLayout="dropdown"
          required
          onSelect={(date) => {
            onDateChange(date || new Date());
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

export const MasterCalendar = ({ locationId }: { locationId: string }) => {
  const [dateString, setDateString] = useSelectedDate();
  const dateKey = dateString;

  const date = useMemo(
    () => parseLocalDate(dateString) ?? new Date(),
    [dateString],
  );

  const { data: appointments, isLoading: isLoadingAppointments } = useQuery(
    trpc.appointment.fetchAppointments.queryOptions(
      {
        dateKey,
        locationId,
      },
      { enabled: Boolean(dateKey), staleTime: 1_000 },
    ),
  );

  const { data: employees, isLoading: isLoadingEmployees } = useQuery(
    trpc.appointment.fetchEmployeesSchedule.queryOptions(
      { locationId, dateKey },
      { enabled: Boolean(dateKey), staleTime: 1_000 },
    ),
  );

  const isCalendarLoading =
    isLoadingEmployees ||
    (employees?.code === "SUCCESS" && (isLoadingAppointments || !appointments));

  const queryClient = useQueryClient();
  const prefetchDay = (delta: number) => {
    const nextDateKey = shiftDateKey(dateString, delta);

    queryClient.prefetchQuery(
      trpc.appointment.fetchEmployeesSchedule.queryOptions(
        { locationId, dateKey: nextDateKey },
        { staleTime: 60_000 },
      ),
    );
  };

  const shiftDays = useCallback(
    (delta: number) => {
      setDateString(shiftDateKey(dateString, delta));
    },
    [dateString, setDateString],
  );

  const setDate = useCallback(
    (date: Date) => {
      setDateString(dateToString(date));
    },
    [dateString, setDateString],
  );

  return (
    <div className="h-[calc(100svh-65px)] w-full">
      <div className="flex items-center gap-3 py-4 px-6 border-b">
        <Button
          variant="outline"
          size="icon"
          onMouseEnter={() => {
            prefetchDay(-1);
          }}
          onClick={() => shiftDays(-1)}
          className="h-10 w-10 rounded-lg border-stone-300 hover:bg-stone-100 hover:border-stone-400 transition-all"
        >
          <ChevronLeft className="w-4 h-4 text-stone-700" />
        </Button>

        {/* <ButtonGroupText>{date.toDateString()}</ButtonGroupText> */}
        <DatePicker date={date} onDateChange={setDate} />
        <Button
          variant="outline"
          size="icon"
          onMouseEnter={() => {
            prefetchDay(1);
          }}
          onClick={() => shiftDays(1)}
          className="h-10 w-10 rounded-lg border-stone-300 hover:bg-stone-100 hover:border-stone-400 transition-all"
        >
          <ChevronRight className="w-4 h-4 text-stone-700" />
        </Button>

        <div className="ml-auto flex items-center gap-2">
          {employees?.code === "SUCCESS" ? (
            <Badge
              variant="secondary"
              className="gap-1.5 font-normal"
              title="All calendar times are shown in this timezone"
            >
              <Clock3 className="size-3.5" />
              {employees.timeZone}
            </Badge>
          ) : null}
          <CalendarSettings />
        </div>
      </div>

      {!!employees && employees.code === "LOCATION_OFF" ? (
        <LocationOff />
      ) : null}

      {isCalendarLoading ? <MasterCalendarSkeleton /> : null}

      {!isCalendarLoading && !!employees && employees.code === "SUCCESS" ? (
        <CalendarProvider
          dateKey={dateKey}
          locationTimeZone={employees.timeZone}
          employees={employees.schedule}
          appointmentsByEmployee={appointments || {}}
        >
          <EmployeeDayCalendar
            locationId={locationId}
            employees={employees.schedule}
            locationTimeZone={employees.timeZone}
            dateKey={dateKey}
          />
        </CalendarProvider>
      ) : null}
    </div>
  );
};

export const EmployeeCalendar = ({ locationId }: { locationId: string }) => {
  const { data: session } = authClient.useSession();
  const [dateString, setDateString] = useSelectedDate();
  const dateKey = dateString;

  const date = useMemo(
    () => parseLocalDate(dateString) ?? new Date(),
    [dateString],
  );

  const { data: appointments, isLoading: isLoadingAppointments } = useQuery(
    trpc.appointment.fetchAppointments.queryOptions(
      {
        dateKey,
        locationId,
      },
      { enabled: Boolean(dateKey), staleTime: 1_000 },
    ),
  );

  const { data: employees, isLoading: isLoadingEmployees } = useQuery(
    trpc.appointment.fetchEmployeesSchedule.queryOptions(
      { locationId, dateKey },
      { enabled: Boolean(dateKey), staleTime: 1_000 },
    ),
  );

  const actorEmployee = useMemo(() => {
    if (!employees || employees.code !== "SUCCESS") return null;
    return findActorEmployee(employees.schedule, session?.user?.id);
  }, [employees, session?.user?.id]);

  const employeeSchedule = useMemo(() => {
    if (!actorEmployee) return [];
    return [actorEmployee];
  }, [actorEmployee]);

  const appointmentsForActor = useMemo<AppointmentResponseType>(() => {
    if (!appointments || !actorEmployee) return {};

    return Object.fromEntries(
      Object.entries(appointments).map(([key, appointmentList]) => [
        key,
        appointmentList.filter(
          (appointment) => appointment.employeeId === actorEmployee.employee.id,
        ),
      ]),
    );
  }, [appointments, actorEmployee]);

  const isCalendarLoading =
    isLoadingEmployees ||
    (employees?.code === "SUCCESS" && (isLoadingAppointments || !appointments));

  const queryClient = useQueryClient();
  const prefetchDay = (delta: number) => {
    const nextDateKey = shiftDateKey(dateString, delta);

    queryClient.prefetchQuery(
      trpc.appointment.fetchEmployeesSchedule.queryOptions(
        { locationId, dateKey: nextDateKey },
        { staleTime: 60_000 },
      ),
    );
  };

  const shiftDays = useCallback(
    (delta: number) => {
      setDateString(shiftDateKey(dateString, delta));
    },
    [dateString, setDateString],
  );

  const setDate = useCallback(
    (nextDate: Date) => {
      setDateString(dateToString(nextDate));
    },
    [setDateString],
  );

  return (
    <div className="h-[calc(100svh-65px)] w-full">
      <div className="flex items-center gap-3 py-4 px-6 border-b">
        <Button
          variant="outline"
          size="icon"
          onMouseEnter={() => {
            prefetchDay(-1);
          }}
          onClick={() => shiftDays(-1)}
          className="h-10 w-10 rounded-lg border-stone-300 hover:bg-stone-100 hover:border-stone-400 transition-all"
        >
          <ChevronLeft className="w-4 h-4 text-stone-700" />
        </Button>

        <DatePicker date={date} onDateChange={setDate} />
        <Button
          variant="outline"
          size="icon"
          onMouseEnter={() => {
            prefetchDay(1);
          }}
          onClick={() => shiftDays(1)}
          className="h-10 w-10 rounded-lg border-stone-300 hover:bg-stone-100 hover:border-stone-400 transition-all"
        >
          <ChevronRight className="w-4 h-4 text-stone-700" />
        </Button>

        <div className="ml-auto flex items-center gap-2">
          {employees?.code === "SUCCESS" ? (
            <Badge
              variant="secondary"
              className="gap-1.5 font-normal"
              title="All calendar times are shown in this timezone"
            >
              <Clock3 className="size-3.5" />
              {employees.timeZone}
            </Badge>
          ) : null}
        </div>
      </div>

      {!!employees && employees.code === "LOCATION_OFF" ? (
        <LocationOff />
      ) : null}

      {isCalendarLoading ? <MasterCalendarSkeleton /> : null}

      {!isCalendarLoading && !!employees && employees.code === "SUCCESS" ? (
        actorEmployee ? (
          <CalendarProvider
            dateKey={dateKey}
            locationTimeZone={employees.timeZone}
            employees={employeeSchedule}
            appointmentsByEmployee={appointmentsForActor}
          >
            <EmployeeDayCalendar
              locationId={locationId}
              employees={employeeSchedule}
              locationTimeZone={employees.timeZone}
              dateKey={dateKey}
            />
          </CalendarProvider>
        ) : (
          <div className="p-6 text-sm text-muted-foreground">
            Unable to load your employee schedule for this location.
          </div>
        )
      ) : null}
    </div>
  );
};

function MasterCalendarSkeleton() {
  const skeletonRows = 24;
  const skeletonEmployees = 4;
  const employeeSlots = Array.from(
    { length: skeletonEmployees },
    (_, value) => `employee-${value}`,
  );
  const rowSlots = Array.from(
    { length: skeletonRows },
    (_, value) => `row-${value}`,
  );

  return (
    <div className="overflow-auto isolate bg-background h-svh">
      <div
        className="grid sticky top-0 z-70 border-b bg-background"
        style={{
          gridTemplateColumns: `80px repeat(${skeletonEmployees}, 1fr)`,
        }}
      >
        <div className="px-2 py-2 border-r">
          <Skeleton className="h-4 w-14" />
        </div>
        {employeeSlots.map((employeeSlot) => (
          <div
            key={`skeleton-header-${employeeSlot}`}
            className="px-2 py-4 border-r"
          >
            <div className="flex items-center justify-center flex-col gap-1">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        ))}
      </div>

      <div
        className="grid relative"
        style={{
          gridTemplateColumns: `80px repeat(${skeletonEmployees}, 1fr)`,
        }}
      >
        <div className="border-r bg-muted">
          {rowSlots.map((rowSlot) => (
            <div
              key={`skeleton-time-${rowSlot}`}
              className="border-t px-2"
              style={{ height: ROW_HEIGHT }}
            >
              {Number.parseInt(rowSlot.replace("row-", ""), 10) %
                (60 / SLOT_MINUTES) ===
              0 ? (
                <Skeleton className="h-3 w-12 mt-1" />
              ) : null}
            </div>
          ))}
        </div>

        {employeeSlots.map((employeeSlot) => (
          <div
            key={`skeleton-column-${employeeSlot}`}
            className="border-r bg-muted/60"
          >
            {rowSlots.map((rowSlot) => (
              <div
                key={`skeleton-cell-${employeeSlot}-${rowSlot}`}
                className="border-t"
                style={{ height: ROW_HEIGHT }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

type AppointmentResponseType =
  inferRouterOutputs<AppRouter>["appointment"]["fetchAppointments"];
const CalendarProvider = ({
  dateKey,
  locationTimeZone,
  employees,
  appointmentsByEmployee,
  children,
}: {
  dateKey: string;
  locationTimeZone: string;
  employees: Employee[];
  appointmentsByEmployee: AppointmentResponseType | undefined;
  children: React.ReactNode;
}) => {
  const locationHours = useMemo<LocationHours | null>(() => {
    if (!employees.length) return null;
    let minTime = Infinity;
    let maxTime = 0;
    let hasWorkingHours = false;

    for (const e of employees) {
      if (e.workHours?.startMinute == null || e.workHours?.endMinute == null) {
        continue;
      }
      hasWorkingHours = true;
      minTime = Math.min(minTime, e.workHours.startMinute);
      maxTime = Math.max(maxTime, e.workHours.endMinute);
    }

    if (!hasWorkingHours) return null;

    return { minTime, maxTime };
  }, [employees]);

  const appointments = useMemo(() => {
    if (!appointmentsByEmployee) return {};
    const appointmentForDate = appointmentsByEmployee[dateKey];
    if (!appointmentForDate) return {};
    return appointmentForDate.reduce(
      (acc, appointment) => {
        const employeeId = appointment.employeeId;
        if (!acc[employeeId]) {
          acc[employeeId] = [];
        }
        acc[employeeId].push({
          ...appointment,
          start: dateToMinutesInTimeZone(
            new Date(appointment.startTime),
            locationTimeZone,
          ),
          end: dateToMinutesInTimeZone(
            new Date(appointment.endTime),
            locationTimeZone,
          ),
          bufferTime: appointment.bufferTime,
          prepTime: appointment.prepTime,
          title: appointment.customer.name,

          customerName: appointment.customer.name,
          serviceNames: appointment.service.map((s) => s.name),
          status: appointment.status,
          paymentStatus: appointment.paymentStatus,
        });
        return acc;
      },
      {} as Record<string, Appointment[]>,
    );
  }, [appointmentsByEmployee, dateKey, locationTimeZone]);

  return (
    <LocationHoursContext.Provider value={locationHours}>
      <ConfirmAppointmentProvider>
        <AppointmentProvider appointmentsByEmployee={appointments}>
          {children}
        </AppointmentProvider>
      </ConfirmAppointmentProvider>
    </LocationHoursContext.Provider>
  );
};
/* ───────────────────────── day calendar ───────────────────────── */

const getFetchAppointmentTRPCKey = (dateKey: string, locationId: string) => {
  return trpc.appointment.fetchAppointments.queryKey({
    dateKey,
    locationId,
  });
};
export function EmployeeDayCalendar({
  locationId,
  employees,
  locationTimeZone,
  dateKey,
}: Readonly<{
  locationId: string;
  employees: Employee[];
  locationTimeZone: string;
  dateKey: string;
}>) {
  const { data: session } = authClient.useSession();
  const update = useAppointmentStore((s) => s.update);
  const resolveCollisions = useAppointmentStore((s) => s.getResolvedTimings);
  const selectedDate = useMemo(
    () => dateKeyToDateInTimeZone(dateKey, locationTimeZone),
    [dateKey, locationTimeZone],
  );
  const queryClient = useQueryClient();
  const { mutate } = useMutation({
    ...trpc.appointment.updateAppointmentTiming.mutationOptions(),
    onError: (error, variables) => {
      console.error("Failed to update appointment:", error);
      toast.error("Failed to update appointment", {
        description:
          error.message || "An unexpected error occurred while updating.",
      });
      // Invalidate to refetch and restore correct state
      queryClient.invalidateQueries({
        queryKey: getFetchAppointmentTRPCKey(dateKey, locationId),
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: getFetchAppointmentTRPCKey(dateKey, locationId),
      });
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { delay: 130, tolerance: 5 },
    }),
  );

  const locationHours = useMemo<LocationHours | null>(() => {
    if (!employees.length) return null;

    let minTime = Infinity;
    let maxTime = 0;
    let hasWorkingHours = false;

    for (const e of employees) {
      if (e.workHours?.startMinute == null || e.workHours?.endMinute == null) {
        continue;
      }
      hasWorkingHours = true;
      minTime = Math.min(minTime, e.workHours.startMinute);
      maxTime = Math.max(maxTime, e.workHours.endMinute);
    }

    if (!hasWorkingHours) return null;

    return { minTime, maxTime };
  }, [employees]);

  const actorEmployeeContext = useMemo(() => {
    const currentUserId = session?.user?.id;

    if (!currentUserId) {
      return {
        actorRoleAtLocation: null,
        actorEmployeeIdAtLocation: null,
      };
    }

    const actorAtLocation = employees.find((employee) => {
      if (!("employee" in employee)) return false;
      const employeeData = employee.employee as { id: string; userId?: string };
      return (
        employeeData.id === currentUserId ||
        employeeData.userId === currentUserId
      );
    });

    if (!actorAtLocation || !("employee" in actorAtLocation)) {
      return {
        actorRoleAtLocation: null,
        actorEmployeeIdAtLocation: null,
      };
    }

    return {
      actorRoleAtLocation: actorAtLocation.employee.role,
      actorEmployeeIdAtLocation: actorAtLocation.employee.id,
    };
  }, [employees, session?.user?.id]);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!active?.data.current || !over?.data.current) return;

      const drag = active.data.current as DragData;
      const drop = over.data.current as DropData;

      if (drag.empId === drop.empId && drag.start === drop.start) return;

      const sourceEmployee = employees.find(
        (e): e is WorkingEmployee =>
          e.code === "WORKING" && e.employee.id === drag.empId,
      );

      const targetEmployee =
        drag.empId === drop.empId
          ? sourceEmployee
          : employees.find(
              (e): e is WorkingEmployee =>
                e.code === "WORKING" && e.employee.id === drop.empId,
            );

      if (!sourceEmployee || !targetEmployee) return;

      const duration = drag.end - drag.start;

      const newTimings = resolveCollisions(
        sourceEmployee,
        targetEmployee,
        drag.id,
        {
          start: drop.start,
          end: drop.start + duration,
          employeeId: drop.empId,
        },
      );

      if (!newTimings) return;

      const newStartDate = dateFromDayMinutesInTimeZone(
        dateKey,
        newTimings.start,
        locationTimeZone,
      );
      const newEndDate = dateFromDayMinutesInTimeZone(
        dateKey,
        newTimings.end,
        locationTimeZone,
      );
      const originalStartTime = dateFromDayMinutesInTimeZone(
        dateKey,
        drag.start,
        locationTimeZone,
      );
      const originalEndTime = dateFromDayMinutesInTimeZone(
        dateKey,
        drag.end,
        locationTimeZone,
      );

      update(sourceEmployee, targetEmployee, drag.id, {
        start: newTimings.start,
        end: newTimings.end,
        employeeId: drop.empId,
      });

      const res = await confirmAppointment({
        appointmentId: drag.id,
        locationId,
        locationTimeZone,
        locationEmployeeId: drop.empId,
        estimatedStartTime: newStartDate,
        estimatedEndTime: newEndDate,
        date: selectedDate,
        customerName: drag.title,
        originalEndTime: originalEndTime,
        originalStartTime: originalStartTime,
        originalLocationEmployeeId: drag.empId,
        prepTime: drag.prepTime,
        bufferTime: drag.bufferTime,
      });
      if (!res.accepted) {
        update(targetEmployee, sourceEmployee, drag.id, {
          start: drag.start,
          end: drag.end,
          employeeId: drag.empId,
        });

        return;
      }

      mutate({
        appointmentId: drag.id,
        locationEmployeeId: drop.empId,
        locationId,
        newEndTime: res.newEndTime,
        newStartTime: res.newStartTime,
        sendConfirmationEmail: res.sendConfirmationEmail,
      });

      update(sourceEmployee, targetEmployee, drag.id, {
        start: dateToMinutesInTimeZone(res.newStartTime, locationTimeZone),
        end: dateToMinutesInTimeZone(res.newEndTime, locationTimeZone),
        employeeId: drop.empId,
      });
    },
    [
      dateKey,
      employees,
      locationTimeZone,
      locationId,
      mutate,
      resolveCollisions,
      selectedDate,
      update,
    ],
  );

  if (!locationHours) return <p>Location is off </p>;

  return (
    <div className="overflow-auto isolate bg-background h-svh">
      <Header employees={employees} locationTimeZone={locationTimeZone} />
      <EditSheet />
      <AddAppointmentDialog
        date={selectedDate}
        employees={employees}
        locationId={locationId}
        locationTimeZone={locationTimeZone}
      />
      <div
        className="grid relative h-svh"
        style={{
          gridTemplateColumns: `80px repeat(${employees.length}, 1fr)`,
        }}
      >
        <CurrentTimeLine
          dateKey={dateKey}
          locationHours={locationHours}
          locationTimeZone={locationTimeZone}
        />
        <TimeColumn locationTimeZone={locationTimeZone} />

        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragEnd={handleDragEnd}
        >
          <AppointmentChargeModalProvider>
            {employees.map((emp) => {
              if (emp.code === "EMPLOYEE_OFF")
                return <AbsentEmployeeColumn key={emp.employee.id} />;
              return (
                <EmployeeColumn
                  key={emp.employee.id}
                  emp={emp}
                  actorRoleAtLocation={actorEmployeeContext.actorRoleAtLocation}
                  actorEmployeeIdAtLocation={
                    actorEmployeeContext.actorEmployeeIdAtLocation
                  }
                />
              );
            })}
          </AppointmentChargeModalProvider>

          <OverlayPlaceholder />
        </DndContext>
      </div>
    </div>
  );
}

/* ───────────────────────── overlay ───────────────────────── */

const getOverEnd = (active: DragData, over: DropData) =>
  over.start + (active.end - active.start);

export function OverlayPlaceholder() {
  const { active, over } = useDndContext();

  const data = active?.data.current as DragData | undefined;
  const overData = over?.data.current as DropData | undefined;

  return (
    <DragOverlay>
      {data && (
        <div
          className="absolute w-full h-full hover:cursor-grabbing rounded-lg text-xs text-white p-1 z-10"
          style={{ backgroundColor: data.color }}
        >
          <p className="line-clamp-1">{data.title}</p>
          <p>
            {overData
              ? `${minutesTo12Hour(overData.start)} - ${minutesTo12Hour(
                  getOverEnd(data, overData),
                )}`
              : `${minutesTo12Hour(data.start)} - ${minutesTo12Hour(data.end)}`}
          </p>
        </div>
      )}
    </DragOverlay>
  );
}

/* ───────────────────────── current time line ───────────────────────── */

export function CurrentTimeLine({
  dateKey,
  locationHours,
  locationTimeZone,
}: Readonly<{
  dateKey: string;
  locationHours: LocationHours;
  locationTimeZone: string;
}>) {
  const [currentMinutes, setCurrentMinutes] = useState(
    getCurrentMinutes(locationTimeZone),
  );

  useEffect(() => {
    if (!isToday(dateKey, locationTimeZone)) return;

    const id = setInterval(
      () => setCurrentMinutes(getCurrentMinutes(locationTimeZone)),
      60_000,
    );

    return () => clearInterval(id);
  }, [dateKey, locationTimeZone]);

  if (!isToday(dateKey, locationTimeZone)) return null;

  const minutesSinceStart = currentMinutes - locationHours.minTime;
  if (minutesSinceStart < 0) return null;

  const top = Math.max(0, (minutesSinceStart / SLOT_MINUTES) * ROW_HEIGHT);

  const { formattedTime } = formatMinutes(currentMinutes, "12h:min");

  return (
    <div
      className="absolute left-0 right-0 z-30 pointer-events-none"
      style={{ top }}
    >
      <div className="absolute left-0 -translate-y-1/2 w-[70px] flex justify-end pr-2">
        <span className="bg-red-500 text-white text-[11px] px-2 py-[2px] rounded-full">
          {formattedTime}
        </span>
      </div>
      <div className="ml-[70px] h-[2px] bg-red-500" />
    </div>
  );
}

/* ───────────────────────── utils ───────────────────────── */

function getCurrentMinutes(timeZone: string) {
  return dateToMinutesInTimeZone(new Date(), timeZone);
}

function isToday(dateKey: string, timeZone: string) {
  return getDateKeyInTimeZone(new Date(), timeZone) === dateKey;
}
