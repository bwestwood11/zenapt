"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { MapPin } from "lucide-react";
import { DEFAULT_REPORT_LOCATION } from "@/components/reports/use-report-location";

type ReportLocationOption = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
};

type ReportLocationFilterProps = Readonly<{
  value: string;
  onChange: (value: string) => void;
  locations: ReportLocationOption[];
}>;

export function ReportLocationFilter(props: ReportLocationFilterProps) {
  const { value, onChange, locations } = props;
  const selectedLocation = locations.find((location) => location.id === value);
  const locationLabel = selectedLocation?.name ?? "All locations";

  return (
    <Select
      value={value}
      onValueChange={(nextValue) => onChange(nextValue || DEFAULT_REPORT_LOCATION)}
    >
      <SelectTrigger className="h-10 min-w-44 justify-between gap-3 rounded-xl border-border/60 bg-background shadow-sm sm:min-w-56" size="sm">
        <div className="flex min-w-0 items-center gap-2.5 text-muted-foreground">
          <MapPin className="h-4 w-4 shrink-0" />
          <span className="truncate text-sm font-medium text-foreground">{locationLabel}</span>
        </div>
      </SelectTrigger>
      <SelectContent className="rounded-xl border-border/60">
        <SelectItem value={DEFAULT_REPORT_LOCATION}>All locations</SelectItem>
        {locations.map((location) => (
          <SelectItem key={location.id} value={location.id}>
            <div className="flex flex-col items-start">
              <span>{location.name}</span>
              {location.city || location.state ? (
                <span className="text-xs text-muted-foreground">
                  {[location.city, location.state].filter(Boolean).join(", ")}
                </span>
              ) : null}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
