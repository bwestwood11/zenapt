"use client";

import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, Clock } from "lucide-react";
import Link from "next/link";

import { trpc } from "@/utils/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";

const daySchema = z
  .object({
    enabled: z.boolean(),
    startTime: z.number().int().min(0).max(1439),
    endTime: z.number().int().min(0).max(1439),
  })
  .refine((value) => !value.enabled || value.endTime > value.startTime, {
    message: "End time must be after start time when enabled.",
  });

const formDataSchema = z.object({
  sunday: daySchema,
  monday: daySchema,
  tuesday: daySchema,
  wednesday: daySchema,
  thursday: daySchema,
  friday: daySchema,
  saturday: daySchema,
});

type FormData = z.infer<typeof formDataSchema>;
type DayName = keyof FormData;
type DayNumber = 0 | 1 | 2 | 3 | 4 | 5 | 6;

const days: ReadonlyArray<{ label: string; key: DayNumber; name: DayName }> = [
  { label: "Monday", key: 1, name: "monday" },
  { label: "Tuesday", key: 2, name: "tuesday" },
  { label: "Wednesday", key: 3, name: "wednesday" },
  { label: "Thursday", key: 4, name: "thursday" },
  { label: "Friday", key: 5, name: "friday" },
  { label: "Saturday", key: 6, name: "saturday" },
  { label: "Sunday", key: 0, name: "sunday" },
];

const dayMap: Record<DayNumber, DayName> = {
  0: "sunday",
  1: "monday",
  2: "tuesday",
  3: "wednesday",
  4: "thursday",
  5: "friday",
  6: "saturday",
};

const defaultDay = {
  enabled: false,
  startTime: 540,
  endTime: 1020,
};

function minsTo12Hour(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const suffix = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${mins.toString().padStart(2, "0")} ${suffix}`;
}

function formatHours(enabled: boolean, startMinute?: number, endMinute?: number) {
  if (!enabled) {
    return "Closed";
  }

  if (startMinute == null || endMinute == null) {
    return "Not set";
  }

  return `${minsTo12Hour(startMinute)} - ${minsTo12Hour(endMinute)}`;
}

function minsToTime(minutes: number) {
  const hours = Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0");
  const mins = (minutes % 60).toString().padStart(2, "0");
  return `${hours}:${mins}`;
}

function timeToMins(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return 0;
  }

  return Math.max(0, Math.min(1439, hours * 60 + minutes));
}

export default function MyWorkingHoursClient({
  locationId,
  slug,
}: Readonly<{ locationId: string; slug: string }>) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery(
    trpc.location.fetchMyWorkingHours.queryOptions({ locationId }),
  );

  const { data: locationSettings, isLoading: isLoadingLocationDefaults } =
    useQuery(
      trpc.location.fetchLocationAppointmentSettings.queryOptions({ locationId }),
    );

  const defaultValues = useMemo<FormData>(() => {
    const byDay: FormData = {
      sunday: { ...defaultDay },
      monday: { ...defaultDay },
      tuesday: { ...defaultDay },
      wednesday: { ...defaultDay },
      thursday: { ...defaultDay },
      friday: { ...defaultDay },
      saturday: { ...defaultDay },
    };

    for (const day of data?.weeklySchedule ?? []) {
      const key = dayMap[day.day as DayNumber];
      if (!key) {
        continue;
      }

      byDay[key] = {
        enabled: day.enabled,
        startTime: day.startMinute ?? defaultDay.startTime,
        endTime: day.endMinute ?? defaultDay.endTime,
      };
    }

    return byDay;
  }, [data?.weeklySchedule]);

  const form = useForm<FormData>({
    resolver: zodResolver(formDataSchema),
    defaultValues,
  });

  const watchedValues = form.watch();

  useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form]);

  const updateWorkingHours = useMutation(
    trpc.location.updateMyWorkingHours.mutationOptions({
      onSuccess: () => {
        toast.success("Working hours updated");
        queryClient.invalidateQueries({
          queryKey: trpc.location.fetchMyWorkingHours.queryKey({ locationId }),
        });
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update working hours");
      },
    }),
  );

  const onSubmit = (values: FormData) => {
    updateWorkingHours.mutate({
      locationId,
      rules: days.map((day) => ({
        day: day.key,
        enabled: values[day.name].enabled,
        startMinute: values[day.name].enabled ? values[day.name].startTime : undefined,
        endMinute: values[day.name].enabled ? values[day.name].endTime : undefined,
      })),
    });
  };

  const rulesForImpactCheck = useMemo(
    () =>
      days.map((day) => {
        const dayValues = watchedValues?.[day.name] ?? defaultValues[day.name];
        return {
          day: day.key,
          enabled: dayValues.enabled,
          startMinute: dayValues.enabled ? dayValues.startTime : undefined,
          endMinute: dayValues.enabled ? dayValues.endTime : undefined,
        };
      }),
    [watchedValues, defaultValues],
  );

  const {
    data: impactData,
    isLoading: isCheckingImpact,
    isFetching: isRefreshingImpact,
    isError: isImpactError,
  } = useQuery({
    ...trpc.location.checkMyWorkingHoursImpact.queryOptions({
      locationId,
      rules: rulesForImpactCheck,
    }),
    enabled: !isLoading && !isLoadingLocationDefaults,
  });

  const impactedAppointments = impactData?.appointments ?? [];
  const isImpactPending = isCheckingImpact || isRefreshingImpact;

  if (isLoading || isLoadingLocationDefaults) {
    return <div className="p-6 text-sm text-muted-foreground">Loading...</div>;
  }

  const currentByDay = new Map(
    (data?.weeklySchedule ?? []).map((day) => [day.day, day]),
  );
  const defaultByDay = new Map(
    (locationSettings?.weeklySchedule ?? []).map((day) => [day.day, day]),
  );

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-foreground">My Working Hours</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your saved hours override this location&apos;s default operating hours
          for your appointment availability.
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Current Hours</CardTitle>
          <CardDescription>
            Current appointment availability for you compared to this location&apos;s
            default hours.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {days.map(({ label, key }) => {
            const current = currentByDay.get(key);
            const defaults = defaultByDay.get(key);

            return (
              <div
                key={key}
                className="grid grid-cols-1 gap-1 rounded-md border border-border p-3 text-sm sm:grid-cols-3"
              >
                <span className="font-medium text-foreground">{label}</span>
                <span className="text-foreground">
                  {formatHours(
                    current?.enabled ?? false,
                    current?.startMinute,
                    current?.endMinute,
                  )}
                </span>
                <span className="text-muted-foreground">
                  Default: {formatHours(
                    defaults?.enabled ?? false,
                    defaults?.startMinute,
                    defaults?.endMinute,
                  )}
                </span>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Alert
        variant={
          isImpactError || impactedAppointments.length > 0
            ? "destructive"
            : "default"
        }
        className="mb-6"
      >
        <AlertTriangle className="size-4" />
        <AlertTitle>Appointment Impact Preview</AlertTitle>
        <AlertDescription>
          {isImpactPending
            ? "Checking appointments against the selected hours..."
            : isImpactError
              ? "Could not verify appointment impact right now. You can keep editing and try again."
              : impactedAppointments.length > 0
            ? `${impactedAppointments.length} upcoming appointment${impactedAppointments.length > 1 ? "s are" : " is"} outside the selected hours.`
            : "No upcoming appointments are affected by the selected hours."}
          {!isImpactPending && impactedAppointments.length > 0 ? (
            <div className="mt-2 space-y-1">
              {impactedAppointments.slice(0, 5).map((appointment) => (
                <div key={appointment.id} className="text-sm">
                  <Link
                    href={`/dashboard/l/${slug}/appointments/${appointment.id}`}
                    className="underline underline-offset-2"
                  >
                    {appointment.customerName}
                  </Link>
                </div>
              ))}
              {impactedAppointments.length > 5 ? (
                <p className="text-xs">
                  +{impactedAppointments.length - 5} more affected appointments
                </p>
              ) : null}
            </div>
          ) : null}
          {!isImpactPending && !isImpactError && impactedAppointments.length > 0 ? (
            <p className="mt-2 text-xs">
              You can still save these changes if you want.
            </p>
          ) : null}
        </AlertDescription>
      </Alert>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Clock className="size-5 text-primary" />
                <CardTitle>Override Weekly Availability</CardTitle>
              </div>
              <CardDescription>
                Disable days you are off and define start/end times to override
                location defaults.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {days.map(({ label, key, name }) => (
                <div key={key} className="flex items-center gap-3">
                  <FormField
                    control={form.control}
                    name={`${name}.enabled`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <Label className="min-w-[90px] text-sm">{label}</Label>

                  <FormField
                    control={form.control}
                    name={`${name}.startTime`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            type="time"
                            className="w-28"
                            value={minsToTime(field.value)}
                            onChange={(event) => field.onChange(timeToMins(event.target.value))}
                            disabled={!form.watch(`${name}.enabled`)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <span className="text-muted-foreground">to</span>

                  <FormField
                    control={form.control}
                    name={`${name}.endTime`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            type="time"
                            className="w-28"
                            value={minsToTime(field.value)}
                            onChange={(event) => field.onChange(timeToMins(event.target.value))}
                            disabled={!form.watch(`${name}.enabled`)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              ))}

              <div className="pt-4">
                <Button type="submit" disabled={updateWorkingHours.isPending || isImpactPending}>
                  {isImpactPending
                    ? "Checking..."
                    : updateWorkingHours.isPending
                      ? "Saving..."
                      : "Save Working Hours"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </Form>
    </div>
  );
}
