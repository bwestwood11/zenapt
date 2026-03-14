"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";

import { trpc } from "@/utils/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import LeaveRequestsSkeleton from "./leave-requests-skeleton";

type Role =
  | "LOCATION_SPECIALIST"
  | "LOCATION_FRONT_DESK"
  | "LOCATION_ADMIN"
  | "ORGANIZATION_MANAGEMENT";

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

export default function LeaveRequestsClient({
  locationId,
  slug,
  role,
}: Readonly<{ locationId: string; slug: string; role: Role }>) {
  const queryClient = useQueryClient();
  const isApprover = APPROVER_ROLES.has(role);
  const isSpecialist = role === "LOCATION_SPECIALIST";

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [noticeDaysInput, setNoticeDaysInput] = useState("1");

  const { data: config, isLoading: isConfigLoading } = useQuery(
    trpc.location.getLeaveRequestConfig.queryOptions({ locationId }),
  );

  useEffect(() => {
    if (config?.leaveRequestNoticeDays != null) {
      setNoticeDaysInput(String(config.leaveRequestNoticeDays));
    }
  }, [config?.leaveRequestNoticeDays]);

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

  const createLeaveRequest = useMutation(
    trpc.location.createMyLeaveRequest.mutationOptions({
      onSuccess: () => {
        toast.success("Leave request submitted");
        setStartDate("");
        setEndDate("");
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
        toast.error(error.message || "Could not submit leave request");
      },
    }),
  );

  const updateConfig = useMutation(
    trpc.location.updateLeaveRequestConfig.mutationOptions({
      onSuccess: () => {
        toast.success("Leave request notice policy updated");
        queryClient.invalidateQueries({
          queryKey: trpc.location.getLeaveRequestConfig.queryKey({ locationId }),
        });
      },
      onError: (error) => {
        toast.error(error.message || "Could not update leave request policy");
      },
    }),
  );

  const reviewLeaveRequest = useMutation(
    trpc.location.reviewLeaveRequest.mutationOptions({
      onSuccess: () => {
        toast.success("Leave request reviewed");
        queryClient.invalidateQueries({
          queryKey: trpc.location.getLocationLeaveRequests.queryKey({ locationId }),
        });
      },
      onError: (error) => {
        toast.error(error.message || "Could not review leave request");
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
    isConfigLoading || isMyRequestsLoading || isLocationRequestsLoading;

  if (isInitialLoading) {
    return (
      <LeaveRequestsSkeleton
        showSpecialistSections={isSpecialist}
        showApproverSections={isApprover}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-foreground">Leave Requests</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Manage specialist leave requests for this location.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Request Policy</CardTitle>
          <CardDescription>
            Leave must be requested at least {config?.leaveRequestNoticeDays ?? 1} day(s) before start date.
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
              <Button
                onClick={() => {
                  const parsed = Number.parseInt(noticeDaysInput, 10);
                  if (Number.isNaN(parsed)) {
                    toast.error("Enter a valid number of days");
                    return;
                  }

                  updateConfig.mutate({
                    locationId,
                    leaveRequestNoticeDays: parsed,
                  });
                }}
                disabled={updateConfig.isPending}
              >
                {updateConfig.isPending ? "Saving..." : "Save Policy"}
              </Button>
            </div>
          ) : null}

          {isApprover ? (
            <p className="text-xs text-muted-foreground">Pending requests: {pendingCount}</p>
          ) : null}
        </CardContent>
      </Card>

      {isSpecialist ? (
        <Card>
          <CardHeader>
            <CardTitle>Request Leave</CardTitle>
            <CardDescription>
              Submit a leave request for review by front desk or location admin.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="leave-start-date">Start date</Label>
                <Input
                  id="leave-start-date"
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="leave-end-date">End date</Label>
                <Input
                  id="leave-end-date"
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="leave-reason">Reason (optional)</Label>
              <Textarea
                id="leave-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Add context for your leave request"
              />
            </div>

            <Button
              onClick={() => {
                if (!startDate || !endDate) {
                  toast.error("Please select both start and end dates");
                  return;
                }

                createLeaveRequest.mutate({
                  locationId,
                  startDate: new Date(`${startDate}T00:00:00`),
                  endDate: new Date(`${endDate}T23:59:59`),
                  reason: reason.trim() ? reason : undefined,
                });
              }}
              disabled={createLeaveRequest.isPending}
            >
              {createLeaveRequest.isPending ? "Submitting..." : "Submit Leave Request"}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {isSpecialist ? (
        <Card>
          <CardHeader>
            <CardTitle>My Leave Requests</CardTitle>
            <CardDescription>Track status of your submitted requests.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(myRequests ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No leave requests yet.</p>
            ) : (
              (myRequests ?? []).map((request) => (
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
      ) : null}

      {isApprover ? (
        <Card>
          <CardHeader>
            <CardTitle>Location Leave Requests</CardTitle>
            <CardDescription>Approve or decline specialist leave requests.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(locationRequests ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No leave requests found.</p>
            ) : (
              (locationRequests ?? []).map((request) => (
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
                        onClick={() =>
                          reviewLeaveRequest.mutate({
                            locationId,
                            requestId: request.id,
                            action: "APPROVE",
                          })
                        }
                        disabled={reviewLeaveRequest.isPending}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() =>
                          reviewLeaveRequest.mutate({
                            locationId,
                            requestId: request.id,
                            action: "DECLINE",
                          })
                        }
                        disabled={reviewLeaveRequest.isPending}
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
      ) : null}

      <p className="text-xs text-muted-foreground">
        Path: /dashboard/l/{slug}/leave-requests
      </p>
    </div>
  );
}
