"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Building2,
  CalendarClock,
  Coffee,
  Plus,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { trpc } from "@/utils/trpc";
import { getInitials } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type DayNumber = 0 | 1 | 2 | 3 | 4 | 5 | 6;

type WeeklyScheduleDay = {
  day: number;
  enabled: boolean;
  startMinute?: number;
  endMinute?: number;
};

type RecurringBreakRule = {
  id: string;
  day: number;
  startMinute: number;
  endMinute: number;
};

type DraftBreakRule = {
  draftId: string;
  day: DayNumber;
  startMinute: number;
  endMinute: number;
};

type BreakTarget = {
  id: string;
  type: "LOCATION" | "EMPLOYEE";
  name: string;
  subtitle: string;
  badgeLabel: string;
  image?: string | null;
  weeklySchedule: WeeklyScheduleDay[];
  breaks: RecurringBreakRule[];
};

const BREAK_INTERVAL_MINUTES = 5;

const DAY_DEFINITIONS: ReadonlyArray<{
  day: DayNumber;
  label: string;
  shortLabel: string;
}> = [
  { day: 1, label: "Monday", shortLabel: "Mon" },
  { day: 2, label: "Tuesday", shortLabel: "Tue" },
  { day: 3, label: "Wednesday", shortLabel: "Wed" },
  { day: 4, label: "Thursday", shortLabel: "Thu" },
  { day: 5, label: "Friday", shortLabel: "Fri" },
  { day: 6, label: "Saturday", shortLabel: "Sat" },
  { day: 0, label: "Sunday", shortLabel: "Sun" },
];

const ROLE_LABELS: Record<string, string> = {
  ORGANIZATION_MANAGEMENT: "Organization Management",
  LOCATION_ADMIN: "Location Admin",
  LOCATION_FRONT_DESK: "Front Desk",
  LOCATION_SPECIALIST: "Specialist",
};

function createDraftId() {
  return globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
}

function sortByDayAndTime<T extends { day: number; startMinute: number }>(items: T[]) {
  return [...items].sort(
    (left, right) => left.day - right.day || left.startMinute - right.startMinute,
  );
}

function formatMinutes(minutes: number) {
  const totalMinutes = Math.max(0, Math.min(1440, minutes));
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const suffix = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;

  return `${displayHours}:${mins.toString().padStart(2, "0")} ${suffix}`;
}

function formatMinuteRange(startMinute: number, endMinute: number) {
  return `${formatMinutes(startMinute)} - ${formatMinutes(endMinute)}`;
}

function formatTimeInputValue(minutes: number) {
  const clampedMinutes = Math.max(0, Math.min(1439, minutes));
  const hours = Math.floor(clampedMinutes / 60)
    .toString()
    .padStart(2, "0");
  const mins = (clampedMinutes % 60).toString().padStart(2, "0");

  return `${hours}:${mins}`;
}

function parseTimeInputValue(value: string) {
  const [hours, minutes] = value.split(":").map(Number);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return 0;
  }

  return Math.max(0, Math.min(1439, hours * 60 + minutes));
}

function isBreakIntervalMinute(minutes: number) {
  return minutes % BREAK_INTERVAL_MINUTES === 0;
}

function getDayMeta(day: number) {
  return (
    DAY_DEFINITIONS.find((entry) => entry.day === day) ?? {
      day: 0 as DayNumber,
      label: "Unknown day",
      shortLabel: "?",
    }
  );
}

function getScheduleLabel(schedule: WeeklyScheduleDay | undefined) {
  if (!schedule?.enabled || schedule.startMinute == null || schedule.endMinute == null) {
    return "No working hours set";
  }

  return formatMinuteRange(schedule.startMinute, schedule.endMinute);
}

function buildDraftBreaks(breaks: RecurringBreakRule[]): DraftBreakRule[] {
  return sortByDayAndTime(
    breaks.map((breakRule) => ({
      draftId: createDraftId(),
      day: breakRule.day as DayNumber,
      startMinute: breakRule.startMinute,
      endMinute: breakRule.endMinute,
    })),
  );
}

function groupDraftBreaksByDay(draftBreaks: DraftBreakRule[]) {
  const breakGroups = new Map<number, DraftBreakRule[]>();

  for (const breakRule of draftBreaks) {
    const dayBreaks = breakGroups.get(breakRule.day) ?? [];
    dayBreaks.push(breakRule);
    breakGroups.set(breakRule.day, dayBreaks);
  }

  return breakGroups;
}

function getDayScheduleError(
  dayBreaks: DraftBreakRule[],
  daySchedule: WeeklyScheduleDay | undefined,
  dayLabel: string,
) {
  if (
    !daySchedule?.enabled ||
    daySchedule.startMinute == null ||
    daySchedule.endMinute == null
  ) {
    return [`${dayLabel} does not have working hours, so breaks cannot be added.`];
  }

  const errors: string[] = [];

  for (const breakRule of dayBreaks) {
    if (breakRule.endMinute <= breakRule.startMinute) {
      errors.push(`${dayLabel} has a break with an invalid time range.`);
      continue;
    }

    if (
      !isBreakIntervalMinute(breakRule.startMinute) ||
      !isBreakIntervalMinute(breakRule.endMinute)
    ) {
      errors.push(`${dayLabel} breaks must start and end in 5-minute increments.`);
    }

    if (
      breakRule.startMinute < daySchedule.startMinute ||
      breakRule.endMinute > daySchedule.endMinute
    ) {
      errors.push(
        `${dayLabel} break ${formatMinuteRange(breakRule.startMinute, breakRule.endMinute)} must stay inside ${formatMinuteRange(daySchedule.startMinute, daySchedule.endMinute)}.`,
      );
    }
  }

  return errors;
}

function hasOverlappingBreaks(dayBreaks: DraftBreakRule[]) {
  for (let index = 1; index < dayBreaks.length; index++) {
    const previousBreak = dayBreaks[index - 1];
    const currentBreak = dayBreaks[index];

    if (currentBreak.startMinute < previousBreak.endMinute) {
      return true;
    }
  }

  return false;
}

function getValidationErrors(
  draftBreaks: DraftBreakRule[],
  weeklySchedule: WeeklyScheduleDay[],
) {
  const scheduleByDay = new Map(weeklySchedule.map((day) => [day.day, day]));
  const errors: string[] = [];
  const breakGroups = groupDraftBreaksByDay(draftBreaks);

  for (const [day, dayBreaks] of breakGroups) {
    const daySchedule = scheduleByDay.get(day);
    const dayLabel = getDayMeta(day).label;
    const sortedBreaks = sortByDayAndTime(dayBreaks);

    errors.push(...getDayScheduleError(sortedBreaks, daySchedule, dayLabel));

    if (hasOverlappingBreaks(sortedBreaks)) {
      errors.push(`${dayLabel} has overlapping breaks.`);
    }
  }

  return Array.from(new Set(errors));
}

function createDefaultBreak(
  day: DayNumber,
  weeklySchedule: WeeklyScheduleDay[],
  existingBreaks: DraftBreakRule[],
): DraftBreakRule | null {
  const schedule = weeklySchedule.find((entry) => entry.day === day);

  if (!schedule?.enabled || schedule.startMinute == null || schedule.endMinute == null) {
    return null;
  }

  const totalAvailableMinutes = schedule.endMinute - schedule.startMinute;
  if (totalAvailableMinutes <= 0) {
    return null;
  }

  const desiredDuration = Math.min(60, totalAvailableMinutes);
  const sortedBreaks = sortByDayAndTime(existingBreaks.filter((entry) => entry.day === day));
  let candidateStart = schedule.startMinute;

  for (const breakRule of sortedBreaks) {
    if (breakRule.startMinute - candidateStart >= desiredDuration) {
      return {
        draftId: createDraftId(),
        day,
        startMinute: candidateStart,
        endMinute: candidateStart + desiredDuration,
      };
    }

    candidateStart = Math.max(candidateStart, breakRule.endMinute);
  }

  const fallbackStart = Math.max(
    schedule.startMinute,
    Math.min(candidateStart, schedule.endMinute - desiredDuration),
  );

  return {
    draftId: createDraftId(),
    day,
    startMinute: fallbackStart,
    endMinute: fallbackStart + desiredDuration,
  };
}

function getBreakGroups(breaks: Array<{ day: number; startMinute: number; endMinute: number }>) {
  const grouped = new Map<number, Array<{ startMinute: number; endMinute: number }>>();

  for (const breakRule of sortByDayAndTime(breaks)) {
    const dayBreaks = grouped.get(breakRule.day) ?? [];
    dayBreaks.push({
      startMinute: breakRule.startMinute,
      endMinute: breakRule.endMinute,
    });
    grouped.set(breakRule.day, dayBreaks);
  }

  return grouped;
}

function BreakSummary({ breaks }: Readonly<{ breaks: RecurringBreakRule[] }>) {
  if (breaks.length === 0) {
    return <p className="text-sm text-muted-foreground">No recurring breaks saved.</p>;
  }

  const groups = getBreakGroups(breaks);

  return (
    <div className="space-y-3">
      {DAY_DEFINITIONS.filter((day) => groups.has(day.day)).map((day) => {
        const dayBreaks = groups.get(day.day) ?? [];

        return (
          <div key={day.day} className="flex flex-col gap-2 sm:flex-row sm:items-start">
            <span className="w-16 text-sm font-medium text-foreground">{day.shortLabel}</span>
            <div className="flex flex-wrap gap-2">
              {dayBreaks.map((breakRule) => (
                <Badge
                  key={`${day.day}-${breakRule.startMinute}-${breakRule.endMinute}`}
                  variant="secondary"
                  className="rounded-full px-3 py-1"
                >
                  {formatMinuteRange(breakRule.startMinute, breakRule.endMinute)}
                </Badge>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BreakTargetCard({
  target,
  onEdit,
}: Readonly<{
  target: BreakTarget;
  onEdit: (target: BreakTarget) => void;
}>) {
  const activeDays = target.weeklySchedule.filter((day) => day.enabled).length;
  const dayCountWithBreaks = new Set(target.breaks.map((breakRule) => breakRule.day)).size;

  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          {target.type === "EMPLOYEE" ? (
            <Avatar className="size-12 border border-border">
              <AvatarImage src={target.image ?? undefined} alt={target.name} />
              <AvatarFallback>{getInitials(target.name)}</AvatarFallback>
            </Avatar>
          ) : (
            <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Building2 className="size-5" />
            </div>
          )}
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-lg">{target.name}</CardTitle>
              <Badge variant="outline">{target.badgeLabel}</Badge>
            </div>
            <CardDescription>{target.subtitle}</CardDescription>
          </div>
        </div>

        <Button variant="outline" onClick={() => onEdit(target)}>
          Manage breaks
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
          <Badge variant="secondary">{target.breaks.length} recurring break{target.breaks.length === 1 ? "" : "s"}</Badge>
          <Badge variant="secondary">{dayCountWithBreaks} day{dayCountWithBreaks === 1 ? "" : "s"} with breaks</Badge>
          <Badge variant="secondary">{activeDays} working day{activeDays === 1 ? "" : "s"}</Badge>
        </div>
        <BreakSummary breaks={target.breaks} />
      </CardContent>
    </Card>
  );
}

function BreakEditorDialog({
  target,
  open,
  onOpenChange,
  onSave,
  isSaving,
}: Readonly<{
  target: BreakTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (target: BreakTarget, breaks: DraftBreakRule[]) => void;
  isSaving: boolean;
}>) {
  const [draftBreaks, setDraftBreaks] = useState<DraftBreakRule[]>([]);

  useEffect(() => {
    setDraftBreaks(target ? buildDraftBreaks(target.breaks) : []);
  }, [target]);

  const validationErrors = useMemo(
    () => (target ? getValidationErrors(draftBreaks, target.weeklySchedule) : []),
    [draftBreaks, target],
  );

  const breaksByDay = useMemo(() => {
    const grouped = new Map<number, DraftBreakRule[]>();

    for (const breakRule of sortByDayAndTime(draftBreaks)) {
      const dayBreaks = grouped.get(breakRule.day) ?? [];
      dayBreaks.push(breakRule);
      grouped.set(breakRule.day, dayBreaks);
    }

    return grouped;
  }, [draftBreaks]);

  const saveChanges = () => {
    if (!target) {
      return;
    }

    if (validationErrors.length > 0) {
      toast.error(validationErrors[0]);
      return;
    }

    onSave(target, sortByDayAndTime(draftBreaks));
  };

  const updateBreak = (
    draftId: string,
    key: "startMinute" | "endMinute",
    value: number,
  ) => {
    setDraftBreaks((currentDrafts) =>
      sortByDayAndTime(
        currentDrafts.map((draftBreak) =>
          draftBreak.draftId === draftId
            ? { ...draftBreak, [key]: value }
            : draftBreak,
        ),
      ),
    );
  };

  const removeBreak = (draftId: string) => {
    setDraftBreaks((currentDrafts) =>
      currentDrafts.filter((draftBreak) => draftBreak.draftId !== draftId),
    );
  };

  const addBreak = (day: DayNumber) => {
    if (!target) {
      return;
    }

    const defaultBreak = createDefaultBreak(day, target.weeklySchedule, draftBreaks);
    if (!defaultBreak) {
      toast.error(`${getDayMeta(day).label} does not have working hours to place a recurring break.`);
      return;
    }

    setDraftBreaks((currentDrafts) => sortByDayAndTime([...currentDrafts, defaultBreak]));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(1120px,calc(100vw-2rem))] sm:max-w-[1120px] max-w-[1120px] p-0">
        {target ? (
          <>
            <DialogHeader className="border-b px-6 py-5">
              <DialogTitle>Manage recurring breaks for {target.name}</DialogTitle>
              <DialogDescription>
                Breaks repeat every week and block appointment availability during the selected windows.
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="max-h-[70vh]">
              <div className="space-y-6 px-6 py-5">
                <Alert variant={validationErrors.length > 0 ? "destructive" : "default"}>
                  <AlertCircle className="size-4" />
                  <AlertTitle>
                    {validationErrors.length > 0
                      ? "Fix a few break rules before saving"
                      : "Break rules look good"}
                  </AlertTitle>
                  <AlertDescription>
                    {validationErrors.length > 0 ? (
                      <div className="space-y-1">
                        {validationErrors.slice(0, 4).map((error) => (
                          <p key={error}>{error}</p>
                        ))}
                        {validationErrors.length > 4 ? (
                          <p>+{validationErrors.length - 4} more issue(s)</p>
                        ) : null}
                      </div>
                    ) : (
                      <p>Breaks must stay inside working hours and cannot overlap on the same day.</p>
                    )}
                  </AlertDescription>
                </Alert>

                <div className="grid gap-4 lg:grid-cols-2">
                  {DAY_DEFINITIONS.map((day) => {
                    const daySchedule = target.weeklySchedule.find(
                      (schedule) => schedule.day === day.day,
                    );
                    const dayBreaks = breaksByDay.get(day.day) ?? [];
                    const canAddBreak =
                      daySchedule?.enabled &&
                      daySchedule.startMinute != null &&
                      daySchedule.endMinute != null &&
                      daySchedule.endMinute > daySchedule.startMinute;

                    return (
                      <Card key={day.day} className="border-border/70">
                        <CardHeader className="space-y-2">
                          <div className="flex items-center justify-between gap-3">
                            <CardTitle className="text-base">{day.label}</CardTitle>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => addBreak(day.day)}
                              disabled={!canAddBreak}
                            >
                              <Plus className="mr-2 size-4" />
                              Add break
                            </Button>
                          </div>
                          <CardDescription>
                            Working hours: {getScheduleLabel(daySchedule)}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {dayBreaks.length === 0 ? (
                            <div className="rounded-lg border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                              No recurring breaks saved for {day.label.toLowerCase()}.
                            </div>
                          ) : (
                            dayBreaks.map((breakRule) => (
                              <div
                                key={breakRule.draftId}
                                className="flex flex-col gap-3 rounded-lg border border-border/70 bg-muted/30 p-3 sm:flex-row sm:items-center"
                              >
                                <Input
                                  type="time"
                                  step={BREAK_INTERVAL_MINUTES * 60}
                                  value={formatTimeInputValue(breakRule.startMinute)}
                                  onChange={(event) =>
                                    updateBreak(
                                      breakRule.draftId,
                                      "startMinute",
                                      parseTimeInputValue(event.target.value),
                                    )
                                  }
                                  className="sm:w-32"
                                />
                                <span className="text-sm text-muted-foreground">to</span>
                                <Input
                                  type="time"
                                  step={BREAK_INTERVAL_MINUTES * 60}
                                  value={formatTimeInputValue(breakRule.endMinute)}
                                  onChange={(event) =>
                                    updateBreak(
                                      breakRule.draftId,
                                      "endMinute",
                                      parseTimeInputValue(event.target.value),
                                    )
                                  }
                                  className="sm:w-32"
                                />
                                <div className="sm:ml-auto">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeBreak(breakRule.draftId)}
                                  >
                                    <Trash2 className="size-4" />
                                    <span className="sr-only">Remove break</span>
                                  </Button>
                                </div>
                              </div>
                            ))
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </ScrollArea>

            <DialogFooter className="border-t px-6 py-4 sm:justify-between">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDraftBreaks([])}
                disabled={draftBreaks.length === 0 || isSaving}
              >
                Clear all breaks
              </Button>
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={saveChanges}
                  disabled={isSaving || validationErrors.length > 0}
                >
                  {isSaving ? "Saving..." : "Save recurring breaks"}
                </Button>
              </div>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export function RecurringBreaksManager({
  locationId,
  slug,
}: Readonly<{
  locationId: string;
  slug: string;
}>) {
  const queryClient = useQueryClient();
  const [editingTarget, setEditingTarget] = useState<BreakTarget | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const { data, isLoading } = useQuery(
    trpc.location.fetchRecurringBreakSettings.queryOptions({ locationId }),
  );

  const saveRecurringBreaks = useMutation(
    trpc.location.updateRecurringBreaks.mutationOptions({
      onSuccess: (result) => {
        toast.success(`Recurring breaks saved for ${result.targetName}.`);
        queryClient.invalidateQueries({
          queryKey: trpc.location.fetchRecurringBreakSettings.queryKey({ locationId }),
        });
        setEditingTarget(null);
      },
      onError: (error) => {
        toast.error(error.message || "Failed to save recurring breaks");
      },
    }),
  );

  const locationTarget = useMemo<BreakTarget | null>(() => {
    if (!data?.location) {
      return null;
    }

    return {
      id: data.location.id,
      type: "LOCATION",
      name: data.location.name,
      subtitle: `Location-wide breaks apply only to appointments booked at this location.`,
      badgeLabel: data.location.timeZone ?? "Location",
      weeklySchedule: data.location.weeklySchedule,
      breaks: data.location.breaks,
    };
  }, [data?.location]);

  const employeeTargets = useMemo<BreakTarget[]>(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return (data?.employees ?? [])
      .map((employee) => ({
        id: employee.id,
        type: "EMPLOYEE" as const,
        name: employee.user.name,
        subtitle: employee.user.email,
        badgeLabel: ROLE_LABELS[employee.role] ?? employee.role,
        image: employee.user.image,
        weeklySchedule: employee.weeklySchedule,
        breaks: employee.breaks,
      }))
      .filter((employee) => {
        if (!normalizedSearch) {
          return true;
        }

        return (
          employee.name.toLowerCase().includes(normalizedSearch) ||
          employee.subtitle.toLowerCase().includes(normalizedSearch) ||
          employee.badgeLabel.toLowerCase().includes(normalizedSearch)
        );
      });
  }, [data?.employees, searchTerm]);

  const employeeTargetsWithBreaks = employeeTargets.filter(
    (employee) => employee.breaks.length > 0,
  ).length;
  const totalEmployeeBreaks = employeeTargets.reduce(
    (total, employee) => total + employee.breaks.length,
    0,
  );

  const handleSaveTargetBreaks = (target: BreakTarget, breaks: DraftBreakRule[]) => {
    saveRecurringBreaks.mutate({
      locationId,
      targetType: target.type,
      locationEmployeeId: target.type === "EMPLOYEE" ? target.id : undefined,
      breaks: breaks.map((breakRule) => ({
        day: breakRule.day,
        startMinute: breakRule.startMinute,
        endMinute: breakRule.endMinute,
      })),
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <Card key={item} className="h-32 animate-pulse bg-muted/40" />
          ))}
        </div>
        <Card className="h-72 animate-pulse bg-muted/40" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Recurring breaks</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Manage repeating breaks for the whole location or for individual employees. Changes on this page stay compatible with existing working-hours rules and immediately affect availability.
          </p>
        </div>
        <Badge variant="outline" className="w-fit rounded-full px-3 py-1 text-sm">
          {slug}
        </Badge>
      </div>

      <Alert>
        <CalendarClock className="size-4" />
        <AlertTitle>Designed for managers and front desk teams</AlertTitle>
        <AlertDescription>
          Use location-wide breaks for this location only, and specialist breaks for lunches, standing pauses, or any recurring unavailable time.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Location-wide breaks</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Building2 className="size-5 text-primary" />
              {locationTarget?.breaks.length ?? 0}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Shared recurring break windows that apply only to this location.
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Specialists with breaks</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Users className="size-5 text-primary" />
              {employeeTargetsWithBreaks}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Specialists who already have one or more recurring breaks saved.
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total employee breaks</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Coffee className="size-5 text-primary" />
              {totalEmployeeBreaks}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Combined recurring break entries across every employee at this location.
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="location" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="location">Location-wide</TabsTrigger>
          <TabsTrigger value="employees">Employees</TabsTrigger>
        </TabsList>

        <TabsContent value="location" className="space-y-4">
          {locationTarget ? (
            <BreakTargetCard target={locationTarget} onEdit={setEditingTarget} />
          ) : (
            <Card>
              <CardContent className="py-10 text-sm text-muted-foreground">
                This location could not be loaded.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="employees" className="space-y-4">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search specialists by name, email, or role"
              className="pl-9"
            />
          </div>

          {employeeTargets.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No specialists match your search.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {employeeTargets.map((target) => (
                <BreakTargetCard key={target.id} target={target} onEdit={setEditingTarget} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <BreakEditorDialog
        target={editingTarget}
        open={Boolean(editingTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setEditingTarget(null);
          }
        }}
        onSave={handleSaveTargetBreaks}
        isSaving={saveRecurringBreaks.isPending}
      />
    </div>
  );
}
