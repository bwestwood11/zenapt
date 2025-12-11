"use client";

import React, { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Calendar as CalendarIcon,
  ChevronDownIcon,
  Plus,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Calendar } from "@/components/ui/calendar";

/**
 * Holiday data model (recommended)
 *
 * - One-time holiday: { recurring: false, date: "YYYY-MM-DD" }
 * - Recurring holiday: { recurring: true, monthDay: "MM-DD" }
 *
 * This keeps recurring holidays independent of year and avoids
 * hardcoding years like `2025-...`.
 */

type ID = string;

export interface HolidayBase {
  id: ID;
  name: string;
  recurring: boolean;
}

export interface OneTimeHoliday extends HolidayBase {
  recurring: false;
  date: string; // ISO yyyy-MM-dd
}

export interface RecurringHoliday extends HolidayBase {
  recurring: true;
  monthDay: string; // MM-DD
}

const isPast = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);

  const t = new Date();
  t.setHours(0, 0, 0, 0);

  return x < t;
};

export type Holiday = OneTimeHoliday | RecurringHoliday;

/* Presets: monthDay is MM-DD and recurring true */
const MAJOR_HOLIDAYS: { name: string; monthDay: string; recurring: true }[] = [
  { name: "New Year's Day", monthDay: "01-01", recurring: true },
  { name: "Martin Luther King Jr. Day", monthDay: "01-15", recurring: true },
  { name: "Presidents' Day", monthDay: "02-19", recurring: true },
  { name: "Memorial Day", monthDay: "05-27", recurring: true },
  { name: "Independence Day", monthDay: "07-04", recurring: true },
  { name: "Labor Day", monthDay: "09-02", recurring: true },
  { name: "Columbus Day", monthDay: "10-14", recurring: true },
  { name: "Veterans Day", monthDay: "11-11", recurring: true },
  { name: "Thanksgiving", monthDay: "11-28", recurring: true },
  { name: "Christmas Eve", monthDay: "12-24", recurring: true },
  { name: "Christmas Day", monthDay: "12-25", recurring: true },
  { name: "New Year's Eve", monthDay: "12-31", recurring: true },
];

/* --- Utilities --- */

const now = () => new Date();

const toISODate = (d: Date) => {
  // produce YYYY-MM-DD (local date)
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const monthDayFromDate = (d: Date) => {
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${m}-${day}`;
};

const parseISODateToDate = (iso: string) => {
  // iso expected YYYY-MM-DD
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};

/**
 * Given a holiday, return the next occurrence's Date object (for display/sorting).
 * - For one-time: parse the date and return that date.
 * - For recurring: consider this year's monthDay, if it's passed then next year.
 */
function nextOccurrence(h: Holiday): Date {
  if (!h.recurring) {
    return parseISODateToDate(h.date);
  }

  const [mm, dd] = h.monthDay.split("-").map(Number);
  const today = now();
  const thisYearCandidate = new Date(today.getFullYear(), mm - 1, dd);
  if (
    thisYearCandidate.getFullYear() > today.getFullYear() ||
    (thisYearCandidate.getFullYear() === today.getFullYear() &&
      thisYearCandidate >=
        new Date(today.getFullYear(), today.getMonth(), today.getDate()))
  ) {
    return thisYearCandidate;
  } else {
    return new Date(today.getFullYear() + 1, mm - 1, dd);
  }
}

function formatHolidayDisplay(h: Holiday) {
  if (!h.recurring) {
    return parseISODateToDate(h.date).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }
  // show month day + "Recurring"
  const [mm, dd] = h.monthDay.split("-");
  const tmp = new Date(new Date().getFullYear(), Number(mm) - 1, Number(dd));
  return `${tmp.toLocaleDateString(undefined, { month: "long", day: "numeric" })} (every year)`;
}

/* --- Hook to manage holidays --- */

function useHolidays(initial: Holiday[] = []) {
  const [holidays, setHolidays] = useState<Holiday[]>(initial);

  const addHoliday = (h: Omit<Holiday, "id">) => {
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : Date.now().toString();

    const newHoliday = { id, ...h } as Holiday;
    setHolidays((prev) => [...prev, newHoliday]);
  };

  const removeHoliday = (id: ID) => {
    setHolidays((prev) => prev.filter((p) => p.id !== id));
  };

  const updateHoliday = (id: ID, patch: Partial<Holiday>) => {
    setHolidays((prev) =>
      prev.map((h) => (h.id === id ? ({ ...h, ...patch } as Holiday) : h))
    );
  };

  const sortedByNextOccurrence = useMemo(() => {
    return [...holidays].sort(
      (a, b) => nextOccurrence(a).getTime() - nextOccurrence(b).getTime()
    );
  }, [holidays]);

  return {
    holidays,
    addHoliday,
    removeHoliday,
    updateHoliday,
    sortedByNextOccurrence,
    setHolidays,
  };
}

/* --- UI Components --- */

export function HolidayExceptionSettings({
  locationId,
}: {
  locationId: string;
}) {
  // initial state could be loaded from server using locationId; here kept local-only
  const {
    holidays,
    addHoliday,
    removeHoliday,
    sortedByNextOccurrence,
    setHolidays,
  } = useHolidays([]);

  console.log(holidays);

  // form state for new holiday
  const [name, setName] = useState("");
  const [recurring, setRecurring] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  const resetForm = () => {
    setName("");
    setRecurring(false);
    setSelectedDate(undefined);
  };

  const handleAdd = () => {
    if (!name) return;
    if (!selectedDate) {
      // if recurring, we might allow adding with only monthDay typed, but UI chooses a date via calendar.
      return;
    }
    if (recurring) {
      addHoliday({
        name,
        recurring: true,
        monthDay: monthDayFromDate(selectedDate),
      } as RecurringHoliday);
    } else {
      addHoliday({
        name,
        recurring: false,
        date: toISODate(selectedDate),
      } as OneTimeHoliday);
    }

    resetForm();
  };

  const handleAddPreset = (preset: {
    name: string;
    monthDay: string;
    recurring: true;
  }) => {
    if (holidays.some((h) => h.name === preset.name && h.recurring)) return;
    addHoliday({
      name: preset.name,
      recurring: true,
      monthDay: preset.monthDay,
    } as RecurringHoliday);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CalendarIcon className="size-5 text-primary" />
          <CardTitle>Holiday & Exception Settings</CardTitle>
        </div>
        <CardDescription>
          Manage holidays, custom closed dates, and special operating hours
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Major Holidays List */}
        <div className="space-y-3">
          <h3 className="font-semibold text-foreground">
            Major Holidays & Closed Dates
          </h3>
          <div className="space-y-2">
            {sortedByNextOccurrence.map((holiday) => (
              <div
                key={holiday.id}
                className="flex items-center justify-between rounded-lg border border-border bg-card p-3"
              >
                <div className="flex items-center gap-3">
                  <div>
                    <p className="font-medium text-foreground">
                      {holiday.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatHolidayDisplay(holiday)}
                    </p>
                  </div>
                  {holiday.recurring && (
                    <Badge variant="secondary" className="text-xs">
                      Recurring Yearly
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      // quick toggle recurring => convert between models safely
                      if (holiday.recurring) {
                        // convert to one-time this year's occurrence
                        const occ = nextOccurrence(holiday);
                        const dateStr = toISODate(occ);
                        setHolidays((prev) =>
                          prev.map((h) =>
                            h.id === holiday.id
                              ? { ...h, recurring: false, date: dateStr }
                              : h
                          )
                        );
                      } else {
                        // convert to recurring using monthDay of the date
                        const one = holiday as OneTimeHoliday;
                        const md = monthDayFromDate(
                          parseISODateToDate(one.date)
                        );
                        setHolidays((prev) =>
                          prev.map((h) =>
                            h.id === holiday.id
                              ? { ...h, recurring: true, monthDay: md }
                              : h
                          )
                        );
                      }
                    }}
                  >
                    {holiday.recurring ? "Make One-time" : "Make Recurring"}
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeHoliday(holiday.id)}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
            {sortedByNextOccurrence.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No holidays added.
              </p>
            )}
          </div>
        </div>

        {/* Add new holiday */}
        <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground">
              Add Custom Holiday / Closed Date
            </h3>
            <HolidaySuggestions
              holidays={holidays}
              onAdd={(h) => handleAddPreset(h)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="holiday-name">Holiday Name</Label>
              <Input
                id="holiday-name"
                placeholder="e.g., Company Retreat"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="holiday-date">Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    id="date"
                    className="w-48 justify-between font-normal"
                  >
                    {selectedDate ? selectedDate.toDateString() : "Select date"}
                    <ChevronDownIcon />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-auto overflow-hidden p-0"
                  align="start"
                >
                  <Calendar
                    mode="single"
                    disabled={isPast}
                    startMonth={new Date(new Date().getFullYear(), new Date().getMonth())}
                    endMonth={new Date(new Date().getFullYear() + 1, new Date().getMonth())}
  
                    selected={selectedDate}
                    captionLayout="dropdown"
                    onSelect={(date) => {
                      setSelectedDate(date ?? undefined);
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Switch
                id="recurring"
                checked={recurring}
                onCheckedChange={(val) => setRecurring(Boolean(val))}
              />
              <Label htmlFor="recurring" className="cursor-pointer text-sm">
                Recur annually
              </Label>
            </div>
            <Button
              onClick={handleAdd}
              size="sm"
              disabled={!name || !selectedDate}
            >
              <Plus className="mr-2 size-4" />
              Add Holiday
            </Button>
          </div>
        </div>

        {/* Half-Day & Emergency Settings */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="half-day">Half-Day Hours (Until)</Label>
            <Input id="half-day" type="time" placeholder="e.g., 14:00" />
          </div>

          <div className="flex items-center justify-between space-x-2 rounded-lg border border-border p-4">
            <Label htmlFor="emergency-closure" className="cursor-pointer">
              Weather/Emergency Closure
            </Label>
            <Switch id="emergency-closure" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* HolidaySuggestions component:
   - shows presets
   - prevents adding duplicates by name
   - uses Popover + Command UI like your original
*/

type AddHolidayFn = (holiday: {
  name: string;
  monthDay: string;
  recurring: true;
}) => void;

function HolidaySuggestions({
  holidays,
  onAdd,
}: {
  holidays: Holiday[];
  onAdd: AddHolidayFn;
}) {
  const [open, setOpen] = useState(false);

  // filter presets that are not already present as recurring with the same monthDay/name
  const filteredOptions = useMemo(() => {
    return MAJOR_HOLIDAYS.filter(
      (h) =>
        !holidays.some(
          (existing) => existing.recurring && existing.name === h.name
        )
    );
  }, [holidays]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className=" justify-start">
          <Plus className="size-4 mr-2" />
          Add a Major Holiday
        </Button>
      </PopoverTrigger>

      <PopoverContent className="p-0 w-[300px]">
        <Command>
          <CommandInput placeholder="Search holiday..." />
          <CommandList>
            <CommandEmpty>No results</CommandEmpty>

            <CommandGroup heading="Major Holidays">
              {filteredOptions.map((holiday) => (
                <CommandItem
                  key={holiday.name}
                  onSelect={() => {
                    onAdd({
                      name: holiday.name,
                      monthDay: holiday.monthDay,
                      recurring: true,
                    });
                    setOpen(false);
                  }}
                  className="cursor-pointer"
                >
                  <div className="flex items-center justify-between w-full">
                    <div>{holiday.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {formatMonthDayToLabel(holiday.monthDay)}
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function formatMonthDayToLabel(monthDay: string) {
  const [mm, dd] = monthDay.split("-").map(Number);
  const tmp = new Date(new Date().getFullYear(), mm - 1, dd);
  return tmp.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
