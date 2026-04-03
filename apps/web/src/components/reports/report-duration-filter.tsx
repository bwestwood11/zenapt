"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarDays } from "lucide-react";
import {
  DEFAULT_REPORT_DURATION,
  REPORT_DURATION_OPTIONS,
  type ReportDuration,
} from "@/components/reports/reporting";

type ReportDurationFilterProps = Readonly<{
  value: ReportDuration;
  onChange: (value: ReportDuration) => void;
}>;

export function ReportDurationFilter(props: ReportDurationFilterProps) {
  const { value, onChange } = props;

  return (
    <Select
      value={value}
      onValueChange={(nextValue) => onChange((nextValue as ReportDuration) ?? DEFAULT_REPORT_DURATION)}
    >
      <SelectTrigger className="h-10 min-w-44 justify-between gap-3 rounded-xl border-border/60 bg-background shadow-sm sm:min-w-48" size="sm">
        <div className="flex items-center gap-2.5 text-muted-foreground">
          <CalendarDays className="h-4 w-4" />
          <SelectValue placeholder="Select duration" />
        </div>
      </SelectTrigger>
      <SelectContent className="rounded-xl border-border/60">
        {REPORT_DURATION_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
