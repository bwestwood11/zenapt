"use client";

import { parseAsString, useQueryState } from "nuqs";
import {
  DEFAULT_REPORT_DURATION,
  type ReportDuration,
} from "@/components/reports/reporting";

export function useReportDuration() {
  const [duration, setDuration] = useQueryState(
    "duration",
    parseAsString
      .withDefault(DEFAULT_REPORT_DURATION)
      .withOptions({ clearOnDefault: false }),
  );

  return {
    duration: duration as ReportDuration,
    setDuration: (nextDuration: ReportDuration) => setDuration(nextDuration),
  };
}
