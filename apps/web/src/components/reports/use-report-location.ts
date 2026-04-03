"use client";

import { parseAsString, useQueryState } from "nuqs";

export const DEFAULT_REPORT_LOCATION = "all";

export function useReportLocation() {
  const [locationId, setLocationId] = useQueryState(
    "location",
    parseAsString
      .withDefault(DEFAULT_REPORT_LOCATION)
      .withOptions({ clearOnDefault: false }),
  );

  return {
    locationId,
    setLocationId,
  };
}
