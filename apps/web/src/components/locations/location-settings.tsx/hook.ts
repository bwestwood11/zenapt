"use client";

import { trpc } from "@/utils/trpc";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { Holiday, ID } from "./types";

export function useHolidays(locationId: string) {
  const {
    data: holidays,
    refetch,
    isLoading,
  } = useQuery(
    trpc.location.fetchLocationHolidays.queryOptions({ locationId })
  );

  const { mutate: createHoliday, isPending: isAdding } = useMutation(
    trpc.location.createLocationHoliday.mutationOptions({
      onSuccess: () => {
        refetch();
      },
    })
  );

  const { mutate: removeHolidayMutate, isPending: isRemoving } = useMutation(
    trpc.location.removeLocationHoliday.mutationOptions({
      onSuccess: () => {
        refetch();
      },
    })
  );

  const addHoliday = (h: Omit<Holiday, "id">) => {
    createHoliday({ locationId, holiday: h });
  };

  const removeHoliday = (id: ID) => {
    removeHolidayMutate({ holidayId: id, locationId });
  };

  return {
    holidays,
    addHoliday,
    removeHoliday,
    isLoadingHolidays: isLoading,
    isMutating: isAdding || isRemoving,
  };
}
