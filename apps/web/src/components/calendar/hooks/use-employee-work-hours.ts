import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";

interface WorkHours {
  startMinute: number;
  endMinute: number;
}

interface UseEmployeeWorkHoursReturn {
  workHours: WorkHours | null;
  isLoading: boolean;
  isError: boolean;
  isLocationClosed: boolean;
}

export const useEmployeeWorkHours = (
  employeeId: string,
  locationId: string,
  dateKey: string,
): UseEmployeeWorkHoursReturn => {
  const {
    data: employeesSchedule,
    isLoading,
    isError,
  } = useQuery(
    trpc.appointment.fetchEmployeesSchedule.queryOptions(
      { locationId, dateKey },
      {
        enabled: !!locationId && !!employeeId,
        staleTime: 60_000, // Cache for 1 minute
        gcTime: 5 * 60_000, // Keep in cache for 5 minutes
      },
    ),
  );

  const result = useMemo(() => {
    // Location is closed
    if (employeesSchedule?.code === "LOCATION_OFF") {
      return {
        workHours: null,
        isLocationClosed: true,
      };
    }

    // Find the specific employee's schedule
    const employeeSchedule = employeesSchedule?.schedule.find(
      (emp) => emp.employee.id === employeeId,
    );

    return {
      workHours: employeeSchedule?.workHours
        ? {
            startMinute: employeeSchedule.workHours.startMinute,
            endMinute: employeeSchedule.workHours.endMinute,
          }
        : null,
      isLocationClosed: false,
    };
  }, [employeesSchedule, employeeId]);

  return {
    ...result,
    isLoading,
    isError,
  };
};
