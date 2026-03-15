"use client";

import { useMemo, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CreditCard, ReceiptText } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Separator } from "../ui/separator";
import { trpc } from "@/utils/trpc";

type NoShowModalProps = Readonly<{
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

export function NoShowModal({
  open,
  onOpenChange,
  appointmentId,
}: NoShowModalProps) {
  const queryClient = useQueryClient();

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
  const noShowPercent = data?.noShowPercent ?? 100;

  const noShowFeeAmount = useMemo(() => {
    if (!data) {
      return 0;
    }

    return Math.round((data.discountedTotalAmount * noShowPercent) / 100);
  }, [data, noShowPercent]);

  const additionalChargeAmount = data
    ? Math.max(0, noShowFeeAmount - data.alreadyChargedAmount)
    : 0;
  const hasLoadedData = !isLoading && data != null;
  const fallbackCardLabel = `Card ending in •••• ${data?.paymentMethodLast4 ?? "****"}`;
  const cardLabel = selectedCard ? getCardLabel(selectedCard) : fallbackCardLabel;

  let chargeDetails: ReactNode = (
    <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-800 dark:text-emerald-200">
      The amount already collected covers the configured no-show fee, so no
      additional charge will be made.
    </div>
  );

  if (additionalChargeAmount > 0 && hasChargeableCard) {
    chargeDetails = (
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

  if (additionalChargeAmount > 0 && !hasChargeableCard) {
    chargeDetails = (
      <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-200">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-medium">No card available to charge</p>
            <p>
              The appointment can still be marked as no-show, but the remaining
              fee will need to be collected manually.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const { mutate, isPending } = useMutation(
    trpc.appointment.markAppointmentNoShow.mutationOptions({
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

        if (result.chargeStatus === "CHARGED") {
          toast.success("Appointment marked as no-show", {
            description: getChargeSuccessDescription({
              chargedAmount: result.chargedAmount,
              paymentMethodLast4: result.paymentMethodLast4,
            }),
          });
          return;
        }

        if (result.chargeStatus === "NOT_CHARGED") {
          toast.success("Appointment marked as no-show", {
            description:
              result.chargeFailureReason ??
              "The no-show fee could not be charged automatically.",
          });
          return;
        }

        toast.success("Appointment marked as no-show", {
          description: "No additional no-show fee was due for this appointment.",
        });
      },
      onError: (error) => {
        toast.error(error.message || "Failed to mark appointment as no-show");
      },
    }),
  );

  let confirmLabel = "Mark No Show";

  if (isPending) {
    confirmLabel = "Updating...";
  } else if (additionalChargeAmount > 0 && hasChargeableCard) {
    confirmLabel = `Charge ${formatUSD(additionalChargeAmount)} & Mark No Show`;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ReceiptText className="size-5" />
            Mark Appointment as No-Show
          </DialogTitle>
          <DialogDescription>
            Review the no-show fee before confirming. The appointment status will
            be updated to no-show.
          </DialogDescription>
        </DialogHeader>

        {hasLoadedData ? (
          <div className="space-y-4 py-2">
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">No-show policy</p>
                  <p className="text-sm text-muted-foreground">
                    {noShowPercent}% of the discounted appointment total may be
                    collected.
                  </p>
                </div>
                <Badge variant="secondary">{formatUSD(noShowFeeAmount)}</Badge>
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
                  <span className="text-muted-foreground">No-show fee total</span>
                  <span>{formatUSD(noShowFeeAmount)}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between gap-3 font-semibold">
                  <span>Additional charge now</span>
                  <span>{formatUSD(additionalChargeAmount)}</span>
                </div>
              </div>
            </div>

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
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={isLoading || !data || isPending}
            onClick={() => mutate({ appointmentId })}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
