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
import { ButtonGroup, ButtonGroupText } from "../ui/button-group";
import { trpc } from "@/utils/trpc";
import LocationOff from "./location-off";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../../server/src/routers";
import {
  confirmAppointment,
  ConfirmAppointmentProvider,
} from "./confirm-modal";
import { Label } from "../ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import {
  CalendarIcon,
  ChevronDownIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Calendar } from "../ui/calendar";
import { add, format, sub } from "date-fns";
import { AddAppointmentDialog } from "./add-appointment-modal";
import { toast } from "sonner";
import { CalendarSettings } from "./settings-popover";

/* ───────────────────────── helpers ───────────────────────── */
export function dateFromDayMinutes(
  date: Date,
  minutesFromStartOfDay: number,
): Date {
  const d = new Date(date); // clone, don’t mutate input
  d.setHours(0, 0, 0, 0);
  d.setMinutes(minutesFromStartOfDay);
  return d;
}

const dateToString = (date: Date) => {
  if (isNaN(date.getTime())) return "";
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

/* ───────────────────────── master calendar ───────────────────────── */

export function DatePicker({
  onDateChange,
  date,
}: {
  date: Date;
  onDateChange: (newDate: Date) => void;
}) {
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

  const date = useMemo(
    () => parseLocalDate(dateString) ?? new Date(),
    [dateString],
  );

  const { data: appointments } = useQuery(
    trpc.appointment.fetchAppointments.queryOptions(
      {
        startDate: date,
        endDate: new Date(
          date.getFullYear(),
          date.getMonth(),
          date.getDate(),
          23,
          59,
          59,
          999,
        ),
        locationId,
      },
      { enabled: !!date, staleTime: 1_000 },
    ),
  );

  const { data: employees } = useQuery(
    trpc.appointment.fetchEmployeesSchedule.queryOptions(
      { locationId, date },
      { enabled: !!date, staleTime: 1_000 },
    ),
  );

  const queryClient = useQueryClient();
  const prefetchDay = (delta: number) => {
    const base = parseLocalDate(dateString);
    if (!base) return;

    const d = new Date(base);
    d.setDate(d.getDate() + delta);

    queryClient.prefetchQuery(
      trpc.appointment.fetchEmployeesSchedule.queryOptions(
        { locationId, date: d },
        { staleTime: 60_000 },
      ),
    );
  };

  const shiftDays = useCallback(
    (delta: number) => {
      const base = parseLocalDate(dateString);
      if (!base) return;
      const next = new Date(base);
      next.setDate(next.getDate() + delta);
      setDateString(dateToString(next));
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

        <div className="ml-auto">
          <CalendarSettings />
        </div>
      </div>

      {!!employees && employees.code === "LOCATION_OFF" ? (
        <LocationOff />
      ) : null}

      {!!employees && employees.code === "SUCCESS" ? (
        <CalendarProvider
          date={date}
          locationTimeZone={employees.timeZone}
          employees={employees.schedule}
          appointmentsByEmployee={appointments || {}}
        >
          <EmployeeDayCalendar
            locationId={locationId}
            employees={employees.schedule}
            locationTimeZone={employees.timeZone}
          />
        </CalendarProvider>
      ) : null}
    </div>
  );
};

function dateToLocalMinutes(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

function getDatePartsInTimeZone(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(date);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number.parseInt(part.value, 10)]),
  );

  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
  };
}

function getDateKeyInTimeZone(date: Date, timeZone: string): string {
  const { year, month, day } = getDatePartsInTimeZone(date, timeZone);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function dateToMinutesInTimeZone(date: Date, timeZone: string): number {
  const { hour, minute } = getDatePartsInTimeZone(date, timeZone);
  return hour * 60 + minute;
}

type AppointmentResponseType =
  inferRouterOutputs<AppRouter>["appointment"]["fetchAppointments"];
const CalendarProvider = ({
  date,
  locationTimeZone,
  employees,
  appointmentsByEmployee,
  children,
}: {
  date: Date;
  locationTimeZone: string;
  employees: Employee[];
  appointmentsByEmployee: AppointmentResponseType | undefined;
  children: React.ReactNode;
}) => {
  const locationHours = useMemo<LocationHours | null>(() => {
    if (!employees.length) return null;
    let minTime = Infinity;
    let maxTime = 0;

    for (const e of employees) {
      if (!e.workHours?.endMinute || !e.workHours?.startMinute) continue;
      minTime = Math.min(minTime, e.workHours.startMinute);
      maxTime = Math.max(maxTime, e.workHours.endMinute);
    }

    return { minTime, maxTime };
  }, [employees]);

  const appointments = useMemo(() => {
    if (!appointmentsByEmployee) return {};
    const appointmentForDate = appointmentsByEmployee[
      getDateKeyInTimeZone(date, locationTimeZone)
    ];
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
        });
        return acc;
      },
      {} as Record<string, Appointment[]>,
    );
  }, [appointmentsByEmployee, date, locationTimeZone]);

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

const getFetchAppointmentTRPCKey = (selectedDate: Date, locationId: string) => {
  return trpc.appointment.fetchAppointments.queryKey({
    startDate: selectedDate,
    endDate: new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate(),
      23,
      59,
      59,
      999,
    ),
    locationId,
  });
};
export function EmployeeDayCalendar({
  locationId,
  employees,
  locationTimeZone,
}: {
  locationId: string;
  employees: Employee[];
  locationTimeZone: string;
}) {
  const update = useAppointmentStore((s) => s.update);
  const resolveCollisions = useAppointmentStore((s) => s.getResolvedTimings);
  const [dateString] = useSelectedDate();
  const selectedDate = useMemo(
    () => parseLocalDate(dateString) ?? new Date(),
    [dateString],
  );
  const queryClient = useQueryClient();
  const { data, mutate } = useMutation({
    ...trpc.appointment.updateAppointmentTiming.mutationOptions(),
    onError: (error, variables) => {
      console.error("Failed to update appointment:", error);
      toast.error("Failed to update appointment", {
        description:
          error.message || "An unexpected error occurred while updating.",
      });
      // Invalidate to refetch and restore correct state
      queryClient.invalidateQueries({
        queryKey: getFetchAppointmentTRPCKey(selectedDate, locationId),
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: getFetchAppointmentTRPCKey(selectedDate, locationId),
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

    for (const e of employees) {
      if (!e.workHours?.endMinute || !e.workHours?.startMinute) continue;
      minTime = Math.min(minTime, e.workHours.startMinute);
      maxTime = Math.max(maxTime, e.workHours.endMinute);
    }

    return { minTime, maxTime };
  }, [employees]);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!active?.data.current || !over?.data.current) return;

      const drag = active.data.current as DragData;
      const drop = over.data.current as DropData;

      if (drag.empId === drop.empId && drag.start === drop.start) return;

      const fromEmployee = employees.find(
        (e) => e.code === "WORKING" && e.employee.id === drag.empId,
      ) as WorkingEmployee | undefined;

      const toEmployee =
        drag.empId === drop.empId
          ? fromEmployee
          : (employees.find(
              (e) => e.code === "WORKING" && e.employee.id === drop.empId,
            ) as WorkingEmployee | undefined);

      if (!fromEmployee || !toEmployee) return;

      const duration = drag.end - drag.start;

      const newTimings = resolveCollisions(fromEmployee, toEmployee, drag.id, {
        start: drop.start,
        end: drop.start + duration,
        employeeId: drop.empId,
      });

      if (!newTimings) return;

      const newStartDate = dateFromDayMinutes(selectedDate, newTimings.start);
      const newEndDate = dateFromDayMinutes(selectedDate, newTimings.end);
      const originalStartTime = dateFromDayMinutes(selectedDate, drag.start);
      const originalEndTime = dateFromDayMinutes(selectedDate, drag.end);

      console.log({ newTimings });

      update(fromEmployee, toEmployee, drag.id, {
        start: newTimings.start,
        end: newTimings.end,
        employeeId: drop.empId,
      });

      const res = await confirmAppointment({
        appointmentId: drag.id,
        locationId,
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
      console.log({ drag });
      if (!res.accepted) {
        update(toEmployee, fromEmployee, drag.id, {
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
      });

      update(fromEmployee, toEmployee, drag.id, {
        start: dateToMinutesInTimeZone(res.newStartTime, locationTimeZone),
        end: dateToMinutesInTimeZone(res.newEndTime, locationTimeZone),
        employeeId: drop.empId,
      });
    },
    [employees, update, locationTimeZone],
  );

  if (!locationHours) return <p>Location is off </p>;

  return (
    <div className="overflow-auto isolate bg-background h-svh">
      <Header employees={employees} />
      <EditSheet />
      <AddAppointmentDialog
        date={selectedDate}
        employees={employees}
        locationId={locationId}
      />
      <div
        className="grid relative h-svh"
        style={{
          gridTemplateColumns: `80px repeat(${employees.length}, 1fr)`,
        }}
      >
        <CurrentTimeLine
          date={selectedDate}
          locationHours={locationHours}
          locationTimeZone={locationTimeZone}
        />
        <TimeColumn />

        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragEnd={handleDragEnd}
        >
          <AppointmentChargeModalProvider>
            {employees.map((emp) => {
              if (emp.code === "EMPLOYEE_OFF")
                return <AbsentEmployeeColumn key={emp.employee.id} />;
              return <EmployeeColumn key={emp.employee.id} emp={emp} />;
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
  date,
  locationHours,
  locationTimeZone,
}: {
  date: Date;
  locationHours: LocationHours;
  locationTimeZone: string;
}) {
  const [currentMinutes, setCurrentMinutes] = useState(
    getCurrentMinutes(locationTimeZone),
  );

  useEffect(() => {
    if (!isToday(date, locationTimeZone)) return;

    const id = setInterval(
      () => setCurrentMinutes(getCurrentMinutes(locationTimeZone)),
      60_000,
    );

    return () => clearInterval(id);
  }, [date, locationTimeZone]);

  if (!isToday(date, locationTimeZone)) return null;

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

function isToday(date: Date, timeZone: string) {
  return (
    getDateKeyInTimeZone(new Date(), timeZone) ===
    getDateKeyInTimeZone(date, timeZone)
  );
}
