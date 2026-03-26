export const REPORT_DURATION_OPTIONS = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "180d", label: "Last 6 months" },
  { value: "365d", label: "Last 12 months" },
] as const;

export type ReportDuration = (typeof REPORT_DURATION_OPTIONS)[number]["value"];

export const DEFAULT_REPORT_DURATION: ReportDuration = "30d";

export const REPORT_QUERY_OPTIONS = {
  staleTime: 5 * 60_000,
  gcTime: 6 * 60_000,
} as const;

export const getReportDurationLabel = (duration: ReportDuration) =>
  REPORT_DURATION_OPTIONS.find((option) => option.value === duration)?.label ??
  "Last 30 days";
