"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CreditCard, ReceiptText } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Label } from "../ui/label";
import { Separator } from "../ui/separator";
import { trpc } from "@/utils/trpc";

type CancelAppointmentModalProps = Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentId: string;
}>;

const formatUSD = (amountInCents: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amountInCents / 100);
};

const formatDurationLabel = (minutes: number) => {
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return `${hours} hour${hours === 1 ? "" : "s"}`;
  }

  return `${minutes} minute${minutes === 1 ? "" : "s"}`;
};

const getCardLabel = (card: {
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
}) => {
  const brand = card.brand.charAt(0).toUpperCase() + card.brand.slice(1);
  return `${brand} •••• ${card.last4} (exp ${String(card.expMonth).padStart(2, "0")}/${card.expYear})`;
};

const getChargeSuccessDescription = ({
  chargedAmount,
  paymentMethodLast4,
}: {
  chargedAmount: number;
  paymentMethodLast4: string | null;
}) => {
  const cardSuffix = paymentMethodLast4 ? ` to •••• ${paymentMethodLast4}` : "";
  return `Charged ${formatUSD(chargedAmount)}${cardSuffix}.`;
};

const getCancellationSuccessDescription = (result: {
  chargeStatus: "CHARGED" | "NOT_CHARGED" | "NOT_NEEDED" | "SKIPPED";
  chargedAmount: number;
  paymentMethodLast4: string | null;
  chargeFailureReason: string | null;
  cancellationWindowApplies: boolean;
}) => {
  if (result.chargeStatus === "CHARGED") {
    return getChargeSuccessDescription({
      chargedAmount: result.chargedAmount,
      paymentMethodLast4: result.paymentMethodLast4,
    });
  }

  if (result.chargeStatus === "SKIPPED") {
    return "Cancellation fee was skipped. No automatic charge was attempted.";
  }

  if (result.chargeStatus === "NOT_CHARGED") {
    return (
      result.chargeFailureReason ??
      "The cancellation fee could not be charged automatically."
    );
  }

  return result.cancellationWindowApplies
    ? "No additional cancellation fee was due for this appointment."
    : "No cancellation fee applied for this appointment.";
};

const getCancellationConfirmLabel = ({
  isPending,
  willAttemptCharge,
  additionalChargeAmount,
}: {
  isPending: boolean;
  willAttemptCharge: boolean;
  additionalChargeAmount: number;
}) => {
  if (isPending) {
    return "Updating...";
  }

  if (willAttemptCharge) {
    return `Charge ${formatUSD(additionalChargeAmount)} & Mark Canceled`;
  }

  return "Mark Canceled";
};

const getCancellationChargeDetails = ({
  cancellationWindowApplies,
  additionalChargeAmount,
  skipCancellationFee,
  hasChargeableCard,
  cardLabel,
}: {
  cancellationWindowApplies: boolean;
  additionalChargeAmount: number;
  skipCancellationFee: boolean;
  hasChargeableCard: boolean;
  cardLabel: string;
}) => {
  if (!cancellationWindowApplies) {
    return (
      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-800 dark:text-emerald-200">
        This cancellation is outside the late-cancellation window, so no
        cancellation fee will be charged.
      </div>
    );
  }

  if (additionalChargeAmount <= 0) {
    return (
      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-800 dark:text-emerald-200">
        No additional cancellation fee is due for this appointment.
      </div>
    );
  }

  if (skipCancellationFee) {
    return (
      <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-200">
        The cancellation fee will be skipped. The appointment will still be
        marked as canceled.
      </div>
    );
  }

  if (hasChargeableCard) {
    return (
      <div className="rounded-lg border p-4 text-sm">
        <div className="flex items-start gap-3">
          <CreditCard className="mt-0.5 size-4 text-muted-foreground" />
          <div>
            <p className="font-medium">Card on file</p>
            <p className="text-muted-foreground">{cardLabel}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-200">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
        <div>
          <p className="font-medium">No card available to charge</p>
          <p>
            The appointment can still be marked as canceled, but the remaining
            fee will need to be collected manually.
          </p>
        </div>
      </div>
    </div>
  );
};

export function CancelAppointmentModal({
  open,
  onOpenChange,
  appointmentId,
}: CancelAppointmentModalProps) {
  const queryClient = useQueryClient();
  const [skipCancellationFee, setSkipCancellationFee] = useState(false);

  useEffect(() => {
    if (!open) {
      setSkipCancellationFee(false);
    }
  }, [open]);

  const { data, isLoading } = useQuery({
    ...trpc.appointment.getAppointmentChargeSummary.queryOptions({
      appointmentId,
    }),
    enabled: open,
  });

  const resolvedPaymentMethodId =
    data?.selectedPaymentMethodId ?? data?.savedPaymentMethods[0]?.id ?? null;
  const selectedCard =
    data?.savedPaymentMethods.find((card) => card.id === resolvedPaymentMethodId) ??
    null;
  const hasFallbackAppointmentCard =
    Boolean(data?.selectedPaymentMethodId) &&
    Boolean(data?.paymentMethodLast4) &&
    !selectedCard;
  const hasChargeableCard = Boolean(selectedCard || hasFallbackAppointmentCard);
  const cancellationPercent = data?.cancellationPercent ?? 100;
  const cancellationDuration = data?.cancellationDuration ?? 60;
  const cancellationWindowApplies = data?.cancellationWindowApplies ?? false;

  const cancellationFeeAmount = useMemo(() => {
    if (!data || !cancellationWindowApplies) {
      return 0;
    }

    return Math.round((data.discountedTotalAmount * cancellationPercent) / 100);
  }, [cancellationPercent, cancellationWindowApplies, data]);

  const additionalChargeAmount =
    data && cancellationWindowApplies
      ? Math.max(0, cancellationFeeAmount - data.alreadyChargedAmount)
      : 0;
  const willAttemptCharge =
    cancellationWindowApplies &&
    !skipCancellationFee &&
    additionalChargeAmount > 0 &&
    hasChargeableCard;
  const hasLoadedData = !isLoading && data != null;
  const fallbackCardLabel = `Card ending in •••• ${data?.paymentMethodLast4 ?? "****"}`;
  const cardLabel = selectedCard ? getCardLabel(selectedCard) : fallbackCardLabel;
  const chargeDetails: ReactNode = getCancellationChargeDetails({
    cancellationWindowApplies,
    additionalChargeAmount,
    skipCancellationFee,
    hasChargeableCard,
    cardLabel,
  });

  const { mutate, isPending } = useMutation(
    trpc.appointment.markAppointmentCanceled.mutationOptions({
      onSuccess: async (result) => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: trpc.appointment.fetchAppointments.queryKey(),
          }),
          queryClient.invalidateQueries({
            queryKey: trpc.appointment.getAppointmentChargeSummary.queryKey({
              appointmentId,
            }),
          }),
          data?.locationId
            ? queryClient.invalidateQueries({
                queryKey: trpc.appointment.getAppointmentDetails.queryKey({
                  locationId: data.locationId,
                  appointmentId,
                }),
              })
            : Promise.resolve(),
        ]);

        onOpenChange(false);

        toast.success("Appointment canceled", {
          description: getCancellationSuccessDescription(result),
        });
      },
      onError: (error) => {
        toast.error(error.message || "Failed to cancel appointment");
      },
    }),
  );
  const confirmLabel = getCancellationConfirmLabel({
    isPending,
    willAttemptCharge,
    additionalChargeAmount,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ReceiptText className="size-5" />
            Cancel Appointment
          </DialogTitle>
          <DialogDescription>
            Review the cancellation fee before confirming. The appointment
            status will be updated to canceled.
          </DialogDescription>
        </DialogHeader>

        {hasLoadedData ? (
          <div className="space-y-4 py-2">
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Cancellation policy</p>
                  <p className="text-sm text-muted-foreground">
                    {cancellationPercent}% of the discounted appointment total
                    may be collected within {formatDurationLabel(cancellationDuration)}
                    of the appointment start time.
                  </p>
                </div>
                <Badge variant="secondary">{formatUSD(cancellationFeeAmount)}</Badge>
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Booked total</span>
                  <span>{formatUSD(data.totalAmount)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Discounted total</span>
                  <span>{formatUSD(data.discountedTotalAmount)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Already collected</span>
                  <span>{formatUSD(data.alreadyChargedAmount)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">
                    Cancellation fee total
                  </span>
                  <span>{formatUSD(cancellationFeeAmount)}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between gap-3 font-semibold">
                  <span>Additional charge now</span>
                  <span>{formatUSD(skipCancellationFee ? 0 : additionalChargeAmount)}</span>
                </div>
              </div>
            </div>

            {cancellationWindowApplies && additionalChargeAmount > 0 ? (
              <div className="flex items-start gap-3 rounded-lg border p-4">
                <Checkbox
                  id="skip-cancellation-fee"
                  checked={skipCancellationFee}
                  onCheckedChange={(checked) => {
                    setSkipCancellationFee(checked === true);
                  }}
                  disabled={isPending}
                />
                <div className="space-y-1">
                  <Label htmlFor="skip-cancellation-fee" className="cursor-pointer">
                    Skip cancellation fee
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Use this if you want to cancel the appointment without
                    charging the customer.
                  </p>
                </div>
              </div>
            ) : null}

            {chargeDetails}
          </div>
        ) : (
          <div className="space-y-3 py-4">
            <div className="h-4 w-40 animate-pulse rounded bg-muted" />
            <div className="h-24 animate-pulse rounded-lg border bg-muted/30" />
            <div className="h-16 animate-pulse rounded-lg border bg-muted/30" />
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Close
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={isLoading || !data || isPending}
            onClick={() =>
              mutate({
                appointmentId,
                skipCancellationFee,
              })
            }
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
