"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  addDays,
  differenceInCalendarDays,
  format,
  isBefore,
  startOfDay,
} from "date-fns";
import type { DateRange } from "react-day-picker";
import { CalendarIcon, Sparkles, X } from "lucide-react";

import { trpc } from "@/utils/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import TimeoffRequestsSkeleton from "./timeoff-requests-skeleton";

type Role =
  | "LOCATION_SPECIALIST"
  | "LOCATION_FRONT_DESK"
  | "LOCATION_ADMIN"
  | "ORGANIZATION_MANAGEMENT";

type TimeoffRequestStatusValue = "PENDING" | "APPROVED" | "DECLINED";

type MyTimeoffRequestItem = {
  id: string;
  startDate: Date;
  endDate: Date;
  reason: string | null;
  reviewNote: string | null;
  status: TimeoffRequestStatusValue;
};

type LocationTimeoffRequestItem = {
  id: string;
  startDate: Date;
  endDate: Date;
  reason: string | null;
  status: TimeoffRequestStatusValue;
  locationEmployee: {
    user: {
      name: string;
    };
  };
};

const APPROVER_ROLES = new Set<Role>([
  "LOCATION_FRONT_DESK",
  "LOCATION_ADMIN",
  "ORGANIZATION_MANAGEMENT",
]);

function statusBadgeVariant(status: string): "default" | "destructive" | "secondary" {
  if (status === "APPROVED") return "default";
  if (status === "DECLINED") return "destructive";
  return "secondary";
}

function getRangeLabel(range: DateRange | undefined) {
  if (!range?.from) {
    return "Choose timeoff dates";
  }

  if (!range.to) {
    return format(range.from, "MMM d, yyyy");
  }

  return `${format(range.from, "MMM d, yyyy")} - ${format(range.to, "MMM d, yyyy")}`;
}

function getSelectionLength(range: DateRange | undefined) {
  if (!range?.from) {
    return 0;
  }

  if (!range.to) {
    return 1;
  }

  return differenceInCalendarDays(range.to, range.from) + 1;
}

function getNextWorkWeekStart(referenceDate: Date) {
  const day = referenceDate.getDay();
  const daysUntilNextMonday = ((8 - day) % 7) || 7;
  return addDays(referenceDate, daysUntilNextMonday);
}

function toSafeCalendarDate(date: Date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    12,
    0,
    0,
    0,
  );
}

function TimeoffPolicyCard({
  configTimeoffRequestNoticeDays,
  isApprover,
  noticeDaysInput,
  setNoticeDaysInput,
  updateTimeoffConfigPending,
  pendingCount,
  onSave,
}: Readonly<{
  configTimeoffRequestNoticeDays: number;
  isApprover: boolean;
  noticeDaysInput: string;
  setNoticeDaysInput: (value: string) => void;
  updateTimeoffConfigPending: boolean;
  pendingCount: number;
  onSave: () => void;
}>) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Request Policy</CardTitle>
        <CardDescription>
          Timeoff must be requested at least {configTimeoffRequestNoticeDays} day(s) before start date.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isApprover ? (
          <div className="flex items-end gap-3">
            <div className="space-y-1">
              <Label htmlFor="notice-days">Minimum notice (days)</Label>
              <Input
                id="notice-days"
                type="number"
                min={0}
                max={60}
                value={noticeDaysInput}
                onChange={(event) => setNoticeDaysInput(event.target.value)}
                className="w-40"
              />
            </div>
            <Button onClick={onSave} disabled={updateTimeoffConfigPending}>
              {updateTimeoffConfigPending ? "Saving..." : "Save Policy"}
            </Button>
          </div>
        ) : null}

        {isApprover ? (
          <p className="text-xs text-muted-foreground">Pending requests: {pendingCount}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function SpecialistTimeoffRequestCard({
  selectedRange,
  setSelectedRange,
  isCalendarOpen,
  setIsCalendarOpen,
  quickSelections,
  selectedDays,
  earliestSelectableDate,
  reason,
  setReason,
  createTimeoffRequestPending,
  onSubmit,
}: Readonly<{
  selectedRange: DateRange | undefined;
  setSelectedRange: (range: DateRange | undefined) => void;
  isCalendarOpen: boolean;
  setIsCalendarOpen: (open: boolean) => void;
  quickSelections: { label: string; range: DateRange }[];
  selectedDays: number;
  earliestSelectableDate: Date;
  reason: string;
  setReason: (value: string) => void;
  createTimeoffRequestPending: boolean;
  onSubmit: () => void;
}>) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Request Timeoff</CardTitle>
        <CardDescription>
          Pick a date range, use quick presets, and submit it for review by front desk or location admin.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Timeoff dates</Label>
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 size-4 text-muted-foreground" />
                  <span className={selectedRange?.from ? "text-foreground" : "text-muted-foreground"}>
                    {getRangeLabel(selectedRange)}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  numberOfMonths={2}
                  defaultMonth={selectedRange?.from ?? earliestSelectableDate}
                  selected={selectedRange}
                  onSelect={(range) => {
                    setSelectedRange(range);

                    if (range?.from && range?.to) {
                      setIsCalendarOpen(false);
                    }
                  }}
                  disabled={{ before: earliestSelectableDate }}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex flex-wrap gap-2">
            {quickSelections.map((selection) => (
              <Button
                key={selection.label}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectedRange(selection.range)}
              >
                <Sparkles className="mr-1 size-3.5" />
                {selection.label}
              </Button>
            ))}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSelectedRange(undefined)}
              disabled={!selectedRange?.from}
            >
              <X className="mr-1 size-3.5" />
              Clear
            </Button>
          </div>

          <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-foreground">Selected range:</span>
              <span className="text-muted-foreground">{getRangeLabel(selectedRange)}</span>
              {selectedDays > 0 ? (
                <Badge variant="secondary">
                  {selectedDays} day{selectedDays > 1 ? "s" : ""}
                </Badge>
              ) : null}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Earliest allowed start: {format(earliestSelectableDate, "MMM d, yyyy")}
            </p>
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="timeoff-reason">Reason (optional)</Label>
          <Textarea
            id="timeoff-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Add context for your timeoff request"
          />
        </div>

        <Button onClick={onSubmit} disabled={createTimeoffRequestPending}>
          {createTimeoffRequestPending ? "Submitting..." : "Submit Timeoff Request"}
        </Button>
      </CardContent>
    </Card>
  );
}

function MyTimeoffRequestsCard({
  myRequests,
}: Readonly<{
  myRequests: MyTimeoffRequestItem[];
}>) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>My Timeoff Requests</CardTitle>
        <CardDescription>Track status of your submitted requests.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {myRequests.length === 0 ? (
          <p className="text-sm text-muted-foreground">No timeoff requests yet.</p>
        ) : (
          myRequests.map((request) => (
            <div key={request.id} className="rounded-md border border-border p-3 text-sm">
              <div className="flex items-center justify-between">
                <span>
                  {format(new Date(request.startDate), "MMM d, yyyy")} - {format(new Date(request.endDate), "MMM d, yyyy")}
                </span>
                <Badge variant={statusBadgeVariant(request.status)}>{request.status}</Badge>
              </div>
              {request.reason ? <p className="mt-2 text-muted-foreground">Reason: {request.reason}</p> : null}
              {request.reviewNote ? (
                <p className="mt-1 text-muted-foreground">Review note: {request.reviewNote}</p>
              ) : null}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function LocationTimeoffRequestsCard({
  locationRequests,
  reviewTimeoffRequestPending,
  onReview,
}: Readonly<{
  locationRequests: LocationTimeoffRequestItem[];
  reviewTimeoffRequestPending: boolean;
  onReview: (requestId: string, action: "APPROVE" | "DECLINE") => void;
}>) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Location Timeoff Requests</CardTitle>
        <CardDescription>Approve or decline specialist timeoff requests.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {locationRequests.length === 0 ? (
          <p className="text-sm text-muted-foreground">No timeoff requests found.</p>
        ) : (
          locationRequests.map((request) => (
            <div key={request.id} className="rounded-md border border-border p-3 text-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">{request.locationEmployee.user.name}</span>
                <Badge variant={statusBadgeVariant(request.status)}>{request.status}</Badge>
              </div>
              <p>
                {format(new Date(request.startDate), "MMM d, yyyy")} - {format(new Date(request.endDate), "MMM d, yyyy")}
              </p>
              {request.reason ? <p className="text-muted-foreground">Reason: {request.reason}</p> : null}

              {request.status === "PENDING" ? (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => onReview(request.id, "APPROVE")}
                    disabled={reviewTimeoffRequestPending}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => onReview(request.id, "DECLINE")}
                    disabled={reviewTimeoffRequestPending}
                  >
                    Decline
                  </Button>
                </div>
              ) : null}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export default function TimeoffRequestsClient({
  locationId,
  slug,
  role,
}: Readonly<{ locationId: string; slug: string; role: Role }>) {
  const queryClient = useQueryClient();
  const isApprover = APPROVER_ROLES.has(role);
  const isSpecialist = role === "LOCATION_SPECIALIST";

  const [selectedRange, setSelectedRange] = useState<DateRange | undefined>();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [noticeDaysInput, setNoticeDaysInput] = useState("1");

  const { data: timeoffConfig, isLoading: isTimeoffConfigLoading } = useQuery(
    trpc.location.getLeaveRequestConfig.queryOptions({ locationId }),
  );

  useEffect(() => {
    if (timeoffConfig?.leaveRequestNoticeDays != null) {
      setNoticeDaysInput(String(timeoffConfig.leaveRequestNoticeDays));
    }
  }, [timeoffConfig?.leaveRequestNoticeDays]);

  const { data: myRequests, isLoading: isMyRequestsLoading } = useQuery({
    ...trpc.location.getMyLeaveRequests.queryOptions({ locationId }),
    enabled: isSpecialist,
  });

  const { data: locationRequests, isLoading: isLocationRequestsLoading } = useQuery({
    ...trpc.location.getLocationLeaveRequests.queryOptions({
      locationId,
    }),
    enabled: isApprover,
  });

  const createTimeoffRequest = useMutation(
    trpc.location.createMyLeaveRequest.mutationOptions({
      onSuccess: () => {
        toast.success("Timeoff request submitted");
        setSelectedRange(undefined);
        setReason("");
        queryClient.invalidateQueries({
          queryKey: trpc.location.getMyLeaveRequests.queryKey({ locationId }),
        });
        if (isApprover) {
          queryClient.invalidateQueries({
            queryKey: trpc.location.getLocationLeaveRequests.queryKey({ locationId }),
          });
        }
      },
      onError: (error) => {
        toast.error(error.message || "Could not submit timeoff request");
      },
    }),
  );

  const updateTimeoffConfig = useMutation(
    trpc.location.updateLeaveRequestConfig.mutationOptions({
      onSuccess: () => {
        toast.success("Timeoff request notice policy updated");
        queryClient.invalidateQueries({
          queryKey: trpc.location.getLeaveRequestConfig.queryKey({ locationId }),
        });
      },
      onError: (error) => {
        toast.error(error.message || "Could not update timeoff request policy");
      },
    }),
  );

  const reviewTimeoffRequest = useMutation(
    trpc.location.reviewLeaveRequest.mutationOptions({
      onSuccess: () => {
        toast.success("Timeoff request reviewed");
        queryClient.invalidateQueries({
          queryKey: trpc.location.getLocationLeaveRequests.queryKey({ locationId }),
        });
      },
      onError: (error) => {
        toast.error(error.message || "Could not review timeoff request");
      },
    }),
  );

  const pendingCount = useMemo(
    () =>
      (locationRequests ?? []).filter((request) => request.status === "PENDING")
        .length,
    [locationRequests],
  );

  const isInitialLoading =
    isTimeoffConfigLoading || isMyRequestsLoading || isLocationRequestsLoading;

  const minNoticeDays = timeoffConfig?.leaveRequestNoticeDays ?? 1;
  const earliestSelectableDate = useMemo(
    () => startOfDay(addDays(new Date(), minNoticeDays)),
    [minNoticeDays],
  );

  const selectedDays = useMemo(
    () => getSelectionLength(selectedRange),
    [selectedRange],
  );

  const quickSelections = useMemo(
    () => {
      const nextWorkWeekStart = getNextWorkWeekStart(earliestSelectableDate);

      return [
        {
          label: "Earliest day",
          range: {
            from: earliestSelectableDate,
            to: earliestSelectableDate,
          } satisfies DateRange,
        },
        {
          label: "3 days",
          range: {
            from: earliestSelectableDate,
            to: addDays(earliestSelectableDate, 2),
          } satisfies DateRange,
        },
        {
          label: "1 week",
          range: {
            from: earliestSelectableDate,
            to: addDays(earliestSelectableDate, 6),
          } satisfies DateRange,
        },
        {
          label: "Next work week",
          range: {
            from: nextWorkWeekStart,
            to: addDays(nextWorkWeekStart, 4),
          } satisfies DateRange,
        },
      ];
    },
    [earliestSelectableDate],
  );

  useEffect(() => {
    if (selectedRange?.from && isBefore(selectedRange.from, earliestSelectableDate)) {
      setSelectedRange(undefined);
    }
  }, [earliestSelectableDate, selectedRange]);

  if (isInitialLoading) {
    return (
      <TimeoffRequestsSkeleton
        showSpecialistSections={isSpecialist}
        showApproverSections={isApprover}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-foreground">Timeoff Requests</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Manage specialist timeoff requests for this location.
        </p>
      </div>

      <TimeoffPolicyCard
        configTimeoffRequestNoticeDays={timeoffConfig?.leaveRequestNoticeDays ?? 1}
        isApprover={isApprover}
        noticeDaysInput={noticeDaysInput}
        setNoticeDaysInput={setNoticeDaysInput}
        updateTimeoffConfigPending={updateTimeoffConfig.isPending}
        pendingCount={pendingCount}
        onSave={() => {
          const parsed = Number.parseInt(noticeDaysInput, 10);
          if (Number.isNaN(parsed)) {
            toast.error("Enter a valid number of days");
            return;
          }

          updateTimeoffConfig.mutate({
            locationId,
            leaveRequestNoticeDays: parsed,
          });
        }}
      />

      {isSpecialist ? (
        <SpecialistTimeoffRequestCard
          selectedRange={selectedRange}
          setSelectedRange={setSelectedRange}
          isCalendarOpen={isCalendarOpen}
          setIsCalendarOpen={setIsCalendarOpen}
          quickSelections={quickSelections}
          selectedDays={selectedDays}
          earliestSelectableDate={earliestSelectableDate}
          reason={reason}
          setReason={setReason}
          createTimeoffRequestPending={createTimeoffRequest.isPending}
          onSubmit={() => {
            if (!selectedRange?.from || !selectedRange?.to) {
              toast.error("Please choose a complete timeoff date range");
              return;
            }

            createTimeoffRequest.mutate({
              locationId,
              startDate: toSafeCalendarDate(selectedRange.from),
              endDate: toSafeCalendarDate(selectedRange.to),
              reason: reason.trim() ? reason : undefined,
            });
          }}
        />
      ) : null}

      {isSpecialist ? (
        <MyTimeoffRequestsCard myRequests={(myRequests ?? []) as MyTimeoffRequestItem[]} />
      ) : null}

      {isApprover ? (
        <LocationTimeoffRequestsCard
          locationRequests={(locationRequests ?? []) as LocationTimeoffRequestItem[]}
          reviewTimeoffRequestPending={reviewTimeoffRequest.isPending}
          onReview={(requestId, action) => {
            reviewTimeoffRequest.mutate({
              locationId,
              requestId,
              action,
            });
          }}
        />
      ) : null}

      <p className="text-xs text-muted-foreground">
        Path: /dashboard/l/{slug}/timeoff-requests
      </p>
    </div>
  );
}
