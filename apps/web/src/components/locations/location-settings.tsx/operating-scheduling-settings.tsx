"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  Form,
  FormField,
  FormItem,
  FormControl,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Clock } from "lucide-react";
import z from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { useMemo } from "react";

export const daySchema = z
  .object({
    enabled: z.boolean(),
    startTime: z.number().int().min(0).max(1439),
    endTime: z.number().int().min(0).max(1439),
  })
  .refine(
    (v) => !v.enabled || v.endTime > v.startTime,
    "End time must be after start time when enabled."
  );

const daysSchema = z.object({
  sunday: daySchema,
  monday: daySchema,
  tuesday: daySchema,
  wednesday: daySchema,
  thursday: daySchema,
  friday: daySchema,
  saturday: daySchema,
});

export const formDataSchema = daysSchema.extend({
  bufferTime: z.number().int().min(0).max(60),
  prepCleanup: z.number().int().min(0).max(30),
  advanceBooking: z.number().int().min(1).max(365),
  lastMinuteCutoff: z.number().int().min(1).max(10080),
});

type DaysSchema = z.infer<typeof daysSchema>;
type Days = keyof DaysSchema;
export type DaysNum = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const DaysMap: Record<DaysNum, Days> = {
  0: "monday",
  1: "tuesday",
  2: "wednesday",
  3: "thursday",
  4: "friday",
  5: "saturday",
  6: "sunday",
};

export type FormData = z.infer<typeof formDataSchema>;

const defaultDay: z.infer<typeof daySchema> = {
  enabled: false,
  startTime: 540, // 09:00 default (optional tweak)
  endTime: 1020, // 17:00 default
};

export function OperatingSchedulingSettings({
  locationId,
}: {
  locationId: string;
}) {
  const { data: location, isLoading } = useQuery(
    trpc.location.fetchLocationAppointmentSettings.queryOptions({ locationId })
  );

  const { appointmentSettings, weeklySchedule: locationHours } = location || {};

  const defaultValues = useMemo<FormData>(() => {
    // base config (non-day fields)
    const base = {
      bufferTime: appointmentSettings?.bufferTime ?? 0,
      prepCleanup: appointmentSettings?.prepTime ?? 0,
      advanceBooking: appointmentSettings?.advanceBookingLimitDays ?? 30,
      lastMinuteCutoff: appointmentSettings?.bookingCutOff
        ? Math.floor(appointmentSettings.bookingCutOff / 60)
        : 1,
    };

    // generate all days structure upfront
    const days: Record<Days, typeof defaultDay> = Object.values(DaysMap).reduce(
      (acc, key) => {
        acc[key] = { ...defaultDay };
        return acc;
      },
      {} as Record<Days, typeof defaultDay>
    );

    // no DB data yet → return full defaults
    if (!locationHours?.length) return { ...days, ...base };

    // override defaults with DB values
    for (const d of locationHours) {
      const key = DaysMap[d.day as DaysNum];
      if (!key) continue;

      days[key] = {
        enabled: d.enabled ?? false,
        startTime: d.startMinute ?? defaultDay.startTime,
        endTime: d.endMinute ?? defaultDay.endTime,
      };
    }

    return { ...days, ...base };
  }, [locationHours]);

  if (isLoading) return "LOADING";

  return (
    <OperatingSchedulingForm
      locationId={locationId}
      defaultValues={defaultValues}
    />
  );
}

export function OperatingSchedulingForm({
  locationId,
  defaultValues,
}: {
  locationId: string;
  defaultValues: FormData;
}) {
  const queryClient = useQueryClient();
  const { mutate, isPending } = useMutation(
    trpc.location.updateLocationOperatingHours.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.location.fetchLocationAppointmentSettings.queryKey({
            locationId,
          }),
        });
      },
    })
  );

  const form = useForm<FormData>({
    resolver: zodResolver(formDataSchema),
    defaultValues: defaultValues,
  });

  const days = [
    { label: "Monday", key: 0, name: "monday" },
    { label: "Tuesday", key: 1, name: "tuesday" },
    { label: "Wednesday", key: 2, name: "wednesday" },
    { label: "Thursday", key: 3, name: "thursday" },
    { label: "Friday", key: 4, name: "friday" },
    { label: "Saturday", key: 5, name: "saturday" },
    { label: "Sunday", key: 6, name: "sunday" },
  ] satisfies Array<{ label: string; key: DaysNum; name: Days }>;

  const onSubmit = (values: FormData) => {
    console.log("Submitting form values:", values);

    mutate({
      locationId,
      bufferTime: values.bufferTime,
      prepTime: values.prepCleanup,
      advanceBookingLimitDays: values.advanceBooking,
      bookingCutOff: values.lastMinuteCutoff * 60, // convert hours to minutes
      rules: days.map(({ key, name }) => ({
        day: key, // convert to 0=Sun ... 6=Sat
        enabled: values[name].enabled,
        startMinute: values[name].enabled ? values[name].startTime : undefined,
        endMinute: values[name].enabled ? values[name].endTime : undefined,
      })),
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="size-5 text-primary" />
              <CardTitle>Operating & Scheduling Preferences</CardTitle>
            </div>
            <CardDescription>
              Configure default scheduling rules and operational hours for this
              location.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Working Hours */}
            <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
              <h3 className="font-semibold text-foreground">
                Default Working Hours
              </h3>

              <div className="grid gap-4 sm:grid-cols-2">
                {days.map(({ label, key, name }) => (
                  <div key={key} className="flex items-center gap-3">
                    {/* Enabled */}
                    <FormField
                      control={form.control}
                      name={`${name}.enabled`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <Label className="min-w-[80px] text-sm">{label}</Label>

                    {/* Start */}
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
                              onChange={(e) =>
                                field.onChange(timeToMins(e.target.value))
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <span className="text-muted-foreground">to</span>

                    {/* End */}
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
                              onChange={(e) =>
                                field.onChange(timeToMins(e.target.value))
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Other Config */}
            <div className="grid gap-6 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="bufferTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Service Buffer Time</FormLabel>
                    <FormControl>
                      <Select
                        defaultValue={String(field.value)}
                        onValueChange={(v) => field.onChange(Number(v))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {[5, 10, 15, 20, 30].map((v) => (
                            <SelectItem key={v} value={String(v)}>
                              {v} minutes
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="prepCleanup"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prep/Cleanup Time</FormLabel>
                    <FormControl>
                      <Select
                        defaultValue={String(field.value)}
                        onValueChange={(v) => field.onChange(Number(v))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {[0, 5, 10, 15].map((v) => (
                            <SelectItem key={v} value={String(v)}>
                              {v} minutes
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="advanceBooking"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Advance Booking Window</FormLabel>
                    <FormControl>
                      <Select
                        defaultValue={String(field.value)}
                        onValueChange={(v) => field.onChange(Number(v))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="7">1 week</SelectItem>
                          <SelectItem value="14">2 weeks</SelectItem>
                          <SelectItem value="30">1 month</SelectItem>
                          <SelectItem value="60">2 months</SelectItem>
                          <SelectItem value="90">3 months</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lastMinuteCutoff"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last-Minute Booking Cutoff</FormLabel>
                    <FormControl>
                      <Select
                        defaultValue={String(field.value)}
                        onValueChange={(v) => field.onChange(Number(v))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 hour</SelectItem>
                          <SelectItem value="2">2 hour</SelectItem>
                          <SelectItem value="4">4 hours</SelectItem>
                          <SelectItem value="24">24 hours</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <Button
              disabled={isPending}
              type="submit"
              className="w-fit ml-auto flex cursor-pointer"
            >
              {isPending ? "Saving..." : "Save Changes"}
            </Button>
          </CardContent>
        </Card>
      </form>
    </Form>
  );
}

function timeToMins(value: string) {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

function minsToTime(minutes: number) {
  const h = Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0");
  const m = (minutes % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}
