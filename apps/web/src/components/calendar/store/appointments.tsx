import { create, createStore, useStore } from "zustand";
import { devtools } from "zustand/middleware";
import type { Appointment, Employee, WorkingEmployee } from "../types";
import { createContext, useContext, useEffect, useState } from "react";

type AppointmentProps = {
  appointmentsByEmployee: Record<string, Appointment[]>;
};

type AppointmentState = {
  setAll: (appts: Appointment[]) => void;
  add: (appt: Appointment) => void;
  update: (
    fromEmployee: WorkingEmployee,
    toEmployee: WorkingEmployee,
    id: string,
    patch: Partial<Appointment>,
  ) => void;
  getResolvedTimings: (
    fromEmployee: WorkingEmployee,
    targetEmployee: WorkingEmployee,
    id: string,
    patch: Partial<Appointment>,
  ) => Interval;
  remove: (employeeId: string, id: string) => void;
} & AppointmentProps;

type AppointmentProviderProps = React.PropsWithChildren<AppointmentProps>;

export function groupBy<T, K extends string | number | symbol>(
  array: T[],
  getKey: (item: T) => K,
): Record<K, T[]> {
  return array.reduce(
    (acc, item) => {
      const key = getKey(item);
      (acc[key] ??= []).push(item);
      return acc;
    },
    {} as Record<K, T[]>,
  );
}

type Interval = { start: number; end: number };

function overlaps(a: Interval, b: Interval) {
  return a.start < b.end && a.end > b.start;
}

function snapToIntervalEdge(moving: Interval, blocker: Interval): Interval {
  const duration = moving.end - moving.start;

  const snapUp: Interval = {
    end: blocker.start,
    start: blocker.start - duration,
  };

  const snapDown: Interval = {
    start: blocker.end,
    end: blocker.end + duration,
  };

  const distUp = Math.abs(moving.end - snapUp.end);
  const distDown = Math.abs(moving.start - snapDown.start);

  return distUp <= distDown ? snapUp : snapDown;
}

function snapToWorkHours(
  interval: Interval,
  employee: WorkingEmployee,
): Interval | null {
  const duration = interval.end - interval.start;

  // Snap DOWN into work start
  if (interval.start < employee.workHours?.startMinute) {
    const start = employee.workHours.endMinute;
    const end = start + duration;

    if (end > employee.workHours.endMinute) return null;
    return { start, end };
  }

  // Snap UP into work end
  if (interval.end > employee.workHours.endMinute) {
    const end = employee.workHours.endMinute;
    const start = end - duration;

    if (start < employee.workHours.startMinute) return null;
    return { start, end };
  }

  return interval;
}

function resolveCollisions(
  initial: Interval,
  targetEmployee: WorkingEmployee,
  appointments: Appointment[],
): Interval | null {
  let current: Interval = { ...initial };

  console.debug("[resolveCollisions] start", {
    initial,
    employeeId: targetEmployee.employee.id,
  });

  // 1️⃣ Snap to work hours
  const snappedToWork = snapToWorkHours(current, targetEmployee);
  if (!snappedToWork) {
    console.warn("[resolveCollisions] failed: outside work hours", {
      attempted: current,
      workHours: targetEmployee.workHours,
    });
    return null;
  }

  if (
    snappedToWork.start !== current.start ||
    snappedToWork.end !== current.end
  ) {
    console.info("[resolveCollisions] snapped to work hours", {
      before: current,
      after: snappedToWork,
    });
  }

  current = snappedToWork;

  // 2️⃣ Resolve break collisions
  for (const b of targetEmployee.breaks) {
    const breakInterval = { start: b.startMinute, end: b.endMinute };

    if (overlaps(current, breakInterval)) {
      console.info("[resolveCollisions] break collision detected", {
        current,
        break: breakInterval,
      });

      const snapped = snapToIntervalEdge(current, breakInterval);

      if (!snapped) {
        console.warn("[resolveCollisions] break snap failed", {
          current,
          break: breakInterval,
        });
        return null;
      }

      console.info("[resolveCollisions] snapped away from break", {
        before: current,
        after: snapped,
        break: breakInterval,
      });

      if (
        snapped.start < targetEmployee.workHours.startMinute ||
        snapped.end > targetEmployee.workHours.endMinute
      ) {
        console.warn("[resolveCollisions] break snap overflowed work hours", {
          snapped,
          workHours: targetEmployee.workHours,
        });
        return null;
      }

      current = snapped;
    }
  }

  // 3️⃣ Resolve appointment collisions
  for (const a of appointments) {
    if (overlaps(current, a)) {
      console.info("[resolveCollisions] appointment collision detected", {
        current,
        appointment: a,
      });

      const snapped = snapToIntervalEdge(current, a);

      if (!snapped) {
        console.warn("[resolveCollisions] appointment snap failed", {
          current,
          appointment: a,
        });
        return null;
      }

      console.info("[resolveCollisions] snapped away from appointment", {
        before: current,
        after: snapped,
        appointment: a,
      });

      if (
        snapped.start < targetEmployee.workHours.startMinute ||
        snapped.end > targetEmployee.workHours.endMinute
      ) {
        console.warn(
          "[resolveCollisions] appointment snap overflowed work hours",
          {
            snapped,
            workHours: targetEmployee.workHours,
          },
        );
        return null;
      }

      current = snapped;
    }
  }

  // 4️⃣ Final validation
  for (const a of appointments) {
    if (overlaps(current, a)) {
      console.error(
        "[resolveCollisions] final validation failed (appointment)",
        {
          current,
          appointment: a,
        },
      );
      return null;
    }
  }

  for (const b of targetEmployee.breaks) {
    const breakInterval = { start: b.startMinute, end: b.endMinute };
    if (overlaps(current, breakInterval)) {
      console.error("[resolveCollisions] final validation failed (break)", {
        current,
        break: breakInterval,
      });
      return null;
    }
  }

  console.debug("[resolveCollisions] success", { result: current });
  return current;
}

export function canPlaceAppointment(
  start: number,
  end: number,
  employee: WorkingEmployee,
  existingAppointments: Appointment[],
) {
  // 1️⃣ Outside working hours
  if (
    start < employee.workHours.startMinute ||
    end > employee.workHours.endMinute
  ) {
    console.error("Outside Work Time");
    return false;
  }

  // 2️⃣ Overlaps breaks
  for (const b of employee.breaks) {
    if (start < b.endMinute && end > b.startMinute) {
      console.error("Dropping over Break", b, { start, end });
      return false;
    }
  }

  // 3️⃣ Overlaps existing appointments
  for (const a of existingAppointments) {
    if (start < a.end && end > a.start) {
      console.error("Dropping over Appointment", a);
      return false;
    }
  }

  return true;
}
export const createAppointmentStore = (
  initialProps?: Partial<AppointmentProps>,
) => {
  const defaultProps: AppointmentProps = {
    appointmentsByEmployee: {},
  };
  return createStore<AppointmentState>()(
    devtools((set, get) => ({
      ...defaultProps,
      ...initialProps,
      setAll: (appts) =>
        set(() => ({
          appointmentsByEmployee: groupBy(appts, (a) => a.employeeId),
        })),

      add: (appt) =>
        set((s) => ({
          appointmentsByEmployee: {
            ...s.appointmentsByEmployee,
            [appt.employeeId]: [
              ...(s.appointmentsByEmployee[appt.employeeId] ?? []),
              appt,
            ],
          },
        })),

      getResolvedTimings: (employee, targetEmployee, id, patch) => {
        const s = get();
        const employeeId = employee.employee.id;

        console.debug("[getResolvedTimings] start", {
          appointmentId: id,
          employeeId,
          patch,
        });

        const sourceList = s.appointmentsByEmployee[employeeId];
        if (!sourceList) {
          console.warn("[getResolvedTimings] no appointments for employee", {
            employeeId,
          });
          return null;
        }

        const idx = sourceList.findIndex((a) => a.id === id);
        if (idx === -1) {
          console.warn("[getResolvedTimings] appointment not found", {
            appointmentId: id,
            employeeId,
          });
          return null;
        }

        const prev = sourceList[idx];
        const updated = { ...prev, ...patch };

        const targetEmployeeId = patch.employeeId ?? employeeId;

        if (targetEmployeeId !== employeeId) {
          console.info("[getResolvedTimings] employee reassignment detected", {
            appointmentId: id,
            from: employeeId,
            to: targetEmployeeId,
          });
        }

        const otherAppointments =
          s.appointmentsByEmployee[targetEmployeeId]?.filter(
            (a) => a.id !== id,
          ) ?? [];

        console.debug("[getResolvedTimings] collision inputs", {
          appointmentId: id,
          interval: { start: updated.start, end: updated.end },
          targetEmployeeId,
          otherAppointmentsCount: otherAppointments.length,
        });

        const resolved = resolveCollisions(
          { start: updated.start, end: updated.end },
          targetEmployee,
          otherAppointments,
        );

        if (!resolved) {
          console.warn("[getResolvedTimings] resolution failed", {
            appointmentId: id,
            attempted: { start: updated.start, end: updated.end },
            targetEmployeeId,
          });
          return null;
        }

        console.info("[getResolvedTimings] resolution success", {
          appointmentId: id,
          resolved,
        });

        return resolved;
      },
      update: (fromEmployee, toEmployee, id, patch) =>
        set((s) => {
          const fromEmployeeId = fromEmployee.employee.id;
          const sourceList = s.appointmentsByEmployee[fromEmployeeId];
          if (!sourceList) return s;

          const idx = sourceList.findIndex((a) => a.id === id);
          if (idx === -1) return s;

          const prev = sourceList[idx];
          const updated = { ...prev, ...patch };

          const targetEmployeeId = patch.employeeId ?? fromEmployeeId;

          const otherAppointments =
            s.appointmentsByEmployee[targetEmployeeId]?.filter(
              (a) => a.id !== id,
            ) ?? [];

          const resolved = resolveCollisions(
            { start: updated.start, end: updated.end },
            toEmployee,
            otherAppointments,
          );

          if (!resolved) return s;

          updated.start = resolved.start;
          updated.end = resolved.end;

          const next = { ...s.appointmentsByEmployee };

          if (targetEmployeeId !== fromEmployeeId) {
            next[fromEmployeeId] = sourceList.filter((a) => a.id !== id);
            next[targetEmployeeId] = [
              ...(next[targetEmployeeId] ?? []),
              updated,
            ];
          } else {
            next[fromEmployeeId] = [
              ...sourceList.slice(0, idx),
              updated,
              ...sourceList.slice(idx + 1),
            ];
          }

          return { appointmentsByEmployee: next };
        }),

      remove: (employeeId, id) =>
        set((s) => ({
          appointmentsByEmployee: {
            ...s.appointmentsByEmployee,
            [employeeId]:
              s.appointmentsByEmployee[employeeId]?.filter(
                (a) => a.id !== id,
              ) ?? [],
          },
        })),
    })),
  );
};
export const AppointmentContext = createContext<
  ReturnType<typeof createAppointmentStore> | undefined
>(undefined);

export function AppointmentProvider({
  children,
  ...props
}: AppointmentProviderProps) {
  const [store] = useState(() => createAppointmentStore(props));

  useEffect(() => {
    console.log("Re-updating the State in the Appointment Provider");
    store.setState({ ...props });
  }, [props]);

  return (
    <AppointmentContext.Provider value={store}>
      {children}
    </AppointmentContext.Provider>
  );
}

export const useAppointmentStore = <T,>(
  selector: (state: AppointmentState) => T,
): T => {
  const store = useContext(AppointmentContext);
  if (!store) {
    throw new Error(
      "useAppointmentStore must be used within an AppointmentProvider",
    );
  }
  return useStore(store, selector);
};

export const useEmployeeAppointments = (employeeId: string) =>
  useAppointmentStore((s) => s.appointmentsByEmployee[employeeId]);
