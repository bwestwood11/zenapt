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
import { MAJOR_HOLIDAYS } from "./constants";
import { useHolidays } from "./hook";

const isPast = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);

  const t = new Date();
  t.setHours(0, 0, 0, 0);

  return x < t;
};

const monthDayFromDate = (d: Date) => {
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${m}-${day}`;
};

function formatHolidayDisplay(monthDay: string) {
  // show month day + "Recurring"
  const [mm, dd] = monthDay.split("-");
  const tmp = new Date(new Date().getFullYear(), Number(mm) - 1, Number(dd));
  return `${tmp.toLocaleDateString(undefined, { month: "long", day: "numeric" })} (every year)`;
}

export function HolidayExceptionSettings({
  locationId,
}: {
  locationId: string;
}) {
  const { holidays, addHoliday, removeHoliday, isLoadingHolidays, isMutating } =
    useHolidays(locationId);

  // form state for new holiday
  const [name, setName] = useState("");

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  const handleAdd = () => {
    if (!name || !selectedDate) return;

    addHoliday({
      name,
      monthDay: monthDayFromDate(selectedDate),
    });

    resetForm();
  };

  const resetForm = () => {
    setName("");
    setSelectedDate(undefined);
  };

  const handleAddMajorHoliday = (preset: {
    name: string;
    monthDay: string;
  }) => {
    if (holidays?.some((h) => h.reason === preset.name)) return;
    addHoliday({
      name: preset.name,
      monthDay: preset.monthDay,
    });
  };

  // filter presets that are not already present as recurring with the same monthDay/name
  const majorHolidays = useMemo(() => {
    return MAJOR_HOLIDAYS.filter(
      (h) => !holidays?.some((existing) => existing.reason === h.name)
    );
  }, [holidays]);

  if (isLoadingHolidays) return "LOADING";

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
            {holidays?.map((holiday) => (
              <div
                key={holiday.id}
                className="flex items-center justify-between rounded-lg border border-border bg-card p-3"
              >
                <div className="flex items-center gap-3">
                  <div>
                    <p className="font-medium text-foreground">
                      {holiday.reason}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatHolidayDisplay(holiday.monthDay)}
                    </p>
                  </div>

                  <Badge variant="secondary" className="text-xs">
                    Recurring Yearly
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={isMutating}
                    onClick={() => removeHoliday(holiday.id)}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
            {!holidays?.length && (
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
              holidays={majorHolidays}
              onAdd={(h) => handleAddMajorHoliday(h)}
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
                    disabled={isMutating}
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
                    startMonth={
                      new Date(new Date().getFullYear(), new Date().getMonth())
                    }
                    endMonth={
                      new Date(
                        new Date().getFullYear() + 1,
                        new Date().getMonth()
                      )
                    }
                    selected={selectedDate}
                    captionLayout="dropdown"
                    onSelect={(date) => {
                      setSelectedDate(date ?? undefined);
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="half-day">Half-Day Hours (Optional)</Label>
              <Input id="half-day" type="time" placeholder="e.g., 14:00" />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Button
              onClick={handleAdd}
              size="sm"
              disabled={!name || !selectedDate || isMutating}
            >
              <Plus className="mr-2 size-4" />
              Add Holiday
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

type AddHolidayFn = (holiday: { name: string; monthDay: string }) => void;

function HolidaySuggestions({
  holidays,
  onAdd,
}: {
  holidays: {
    name: string;
    monthDay: string;
  }[];
  onAdd: AddHolidayFn;
}) {
  const [open, setOpen] = useState(false);

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
              {holidays.map((holiday) => (
                <CommandItem
                  key={holiday.name}
                  onSelect={() => {
                    onAdd({
                      name: holiday.name,
                      monthDay: holiday.monthDay,
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
