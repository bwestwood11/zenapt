// confirm.tsx
"use client";
import React, { type ReactNode, useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "../ui/input";
import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { AlertCircle, ArrowRight, Calendar, Clock, Mail } from "lucide-react";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";

export type ConfirmOptions = {
  originalStartTime: Date;
  originalEndTime: Date;
  date: Date;
  customerName: string;
  estimatedStartTime: Date;
  estimatedEndTime: Date;
  originalLocationEmployeeId: string;
  locationEmployeeId: string;
  appointmentId: string;
  locationId: string;
};

export type ConfirmationResponse =
  | {
      accepted: false;
    }
  | {
      accepted: true;
      newStartTime: Date;
      newEndTime: Date;
      isChangingDuration: boolean;
      sendConfirmationEmail: boolean;
    };

type Request = {
  options: ConfirmOptions;
  resolve: (response: ConfirmationResponse) => void;
};

let globalHandler:
  | ((opts: ConfirmOptions) => Promise<ConfirmationResponse>)
  | null = null;

/**
 * Call this from anywhere in your app.
 * Example: `const ok = await confirmAppointment({ title: "Delete?", description: "This is permanent." })`
 */
export function confirmAppointment(
  opts: ConfirmOptions
): Promise<ConfirmationResponse> {
  if (!globalHandler) {
    throw new Error(
      "confirmAppointment() called before ConfirmAppointmentProvider was mounted. Wrap your app in <ConfirmAppointmentProvider />."
    );
  }
  return globalHandler(opts);
}

const formatTime = (date: Date | undefined) => {
  if (!date) return undefined;
  return Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

/**
 * Provider that must wrap your app (e.g. in layout.tsx / App.tsx).
 */
export const ConfirmAppointmentProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [queue, setQueue] = useState<Request[]>([]);
  const [current, setCurrent] = useState<Request | null>(null);
  const [shouldChangeDuration, setShouldChangeDuration] = useState(false);
  const [sendEmailNotification, setSendEmailNotification] = useState(false);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    // set global handler
    globalHandler = (opts: ConfirmOptions) =>
      new Promise<ConfirmationResponse>((resolve) => {
        const req: Request = { options: opts, resolve };
        setQueue((q) => {
          // if nothing is active and queue empty, we can set current immediately in effect below
          return [...q, req];
        });
      });

    return () => {
      mounted.current = false;
      globalHandler = null;
    };
  }, []);

  // whenever queue changes and no current, pop the next request
  useEffect(() => {
    if (!current && queue.length > 0) {
      const [next, ...rest] = queue;
      setCurrent(next);
      setQueue(rest);
    }
  }, [queue, current]);

  const { data, isLoading } = useQuery(
    trpc.appointment.getNewTimingEstimate.queryOptions(
      {
        appointmentId: current?.options.appointmentId ?? "",
        locationEmployeeId: current?.options.locationEmployeeId ?? "",
        locationId: current?.options.locationId ?? "",
        proposedStartTime: current?.options.estimatedStartTime ?? new Date(0),
        changeDuration: shouldChangeDuration,
        proposedEndTime: current?.options.estimatedEndTime ?? new Date(0),
      },
      { enabled: !!current?.options.appointmentId }
    )
  );

  const close = () => {
    if (current) {
      // resolve the promise for the current request
      try {
        current.resolve({ accepted: false });
      } catch {
        /* ignore */
      }

      setCurrent(null);
      setShouldChangeDuration(false);
      setSendEmailNotification(false);
    }
  };

  const confirm = () => {
    if (current && !isLoading) {
      // resolve the promise for the current request
      try {
        if (!data) {
          current.resolve({ accepted: false });
          return;
        }

        if (data.hasConflict) {
          return;
        }

        current.resolve({
          accepted: true,
          isChangingDuration: shouldChangeDuration,
          newEndTime: data?.proposedEndTime,
          newStartTime: data?.proposedStartTime,
          sendConfirmationEmail: sendEmailNotification,
        });
      } catch {
        /* ignore */
      }
      setCurrent(null);
      setShouldChangeDuration(false);
      setSendEmailNotification(false);
    }
  };

  return (
    <>
      {children}
      {/* Controlled AlertDialog */}
      <Dialog open={!!current} onOpenChange={() => close()}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              Reschedule Appointment
            </DialogTitle>
            <DialogDescription>
              Review the time change below and adjust the duration if needed.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Time Comparison Section */}
            <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-stretch">
              {/* Original Time - Muted Red */}
              <div className="relative rounded-lg border-2 border-red-200 bg-red-50/50 dark:border-red-900/50 dark:bg-red-950/20 p-4 space-y-2 min-h-[120px] flex flex-col justify-center">
                <div className="flex items-center gap-2 text-xs font-medium text-red-700 dark:text-red-400 uppercase tracking-wide">
                  <Calendar className="size-3.5" />
                  <span>Original Time</span>
                </div>
                <div className="font-semibold text-base text-red-950 dark:text-red-50">
                  {current?.options.customerName}
                </div>
                <div className="flex items-center gap-2 text-red-900 dark:text-red-100">
                  <Clock className="size-4 text-red-600 dark:text-red-400" />
                  <div className="font-semibold text-lg">
                    {formatTime(current?.options.originalStartTime)}
                  </div>
                </div>
                <div className="text-sm text-red-700 dark:text-red-300">
                  to {formatTime(current?.options.originalEndTime)}
                </div>
              </div>

              {/* Arrow Separator */}
              <div className="flex items-center justify-center">
                <div className="rounded-full bg-primary/10 p-2">
                  <ArrowRight className="size-5 text-primary" />
                </div>
              </div>

              {/* New Time - Vibrant Green */}
              <div className="relative rounded-lg border-2 border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/30 p-4 space-y-2 shadow-sm min-h-[120px] flex flex-col justify-center">
                <div className="flex items-center gap-2 text-xs font-medium text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">
                  <Calendar className="size-3.5" />
                  <span>New Time</span>
                </div>
                <div className="font-semibold text-base text-emerald-950 dark:text-emerald-50">
                  {current?.options.customerName}
                </div>
                <div className="flex items-center gap-2 text-emerald-950 dark:text-emerald-50">
                  <Clock className="size-4 text-emerald-600 dark:text-emerald-400" />
                  <div className="font-semibold text-lg">
                    {formatTime(
                      data?.proposedStartTime ||
                        current?.options.estimatedStartTime
                    )}
                  </div>
                </div>
                <div className="text-sm text-emerald-800 dark:text-emerald-200">
                  to{" "}
                  {formatTime(
                    data?.proposedEndTime || current?.options.estimatedEndTime
                  )}
                </div>
              </div>
            </div>

            {current?.options.originalLocationEmployeeId !==
              current?.options.locationEmployeeId && (
              <div className="flex items-center justify-between rounded-lg border bg-card p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-blue-500/10 p-2 mt-0.5">
                    <Clock className="size-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="space-y-1">
                    <Label
                      htmlFor="change-duration"
                      className="text-sm font-medium cursor-pointer"
                    >
                      Change Appointment Duration
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Adjust duration based on new provider
                    </p>
                  </div>
                </div>
                <Switch
                  id="change-duration"
                  checked={shouldChangeDuration}
                  onCheckedChange={setShouldChangeDuration}
                />
              </div>
            )}

            {/* Email Notification Switch */}
            <div className="flex items-center justify-between rounded-lg border bg-card p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-primary/10 p-2 mt-0.5">
                  <Mail className="size-4 text-primary" />
                </div>
                <div className="space-y-1">
                  <Label
                    htmlFor="email-notification"
                    className="text-sm font-medium cursor-pointer"
                  >
                    Send Email Notification
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Notify client about the appointment change
                  </p>
                </div>
              </div>
              <Switch
                id="email-notification"
                checked={sendEmailNotification}
                onCheckedChange={setSendEmailNotification}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 sm:flex-col">
            {/* Conflicts Warning */}
            {data?.hasConflict && (
              <div className="w-full rounded-lg border-2 border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-950/30 p-3 mb-4 sm:col-span-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="size-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-800 dark:text-red-200 font-medium">
                    This time slot has scheduling conflicts. Please review
                    before confirming.
                  </p>
                </div>
              </div>
            )}
            <div className="flex w-full justify-end gap-2">
              <Button variant="outline" onClick={close}>
                Cancel
              </Button>
              <Button
                disabled={data?.hasConflict || isLoading}
                onClick={confirm}
              >
                Confirm Reschedule
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
