"use client";

import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  AlertTriangle,
  CalendarDays,
  Clock3,
  CreditCard,
  Loader2,
  LogOut,
  MapPin,
  Plus,
  ShieldCheck,
  Trash2,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
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
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import getStripe from "@/lib/stripe/config";
import { cn } from "@/lib/utils";
import { trpc } from "@/utils/trpc";
import { toast } from "sonner";

type CustomerPortalDashboardProps = Readonly<{
  organizationId: string;
}>;

type SavedCard = {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
};

type PortalAppointment = {
  id: string;
  startTime: Date;
  endTime: Date;
  status: string;
  paymentStatus: string;
  price: number;
  location: {
    id: string;
    name: string;
    timeZone?: string | null;
  };
  serviceNames: string[];
};

type CancellationPreview = {
  appointmentId: string;
  startTime: Date;
  endTime: Date;
  location: {
    name: string;
  };
  serviceNames: string[];
  totalAmount: number;
  discountAmount: number;
  discountedTotalAmount: number;
  alreadyChargedAmount: number;
  cancellationPercent: number;
  cancellationDuration: number;
  cancellationWindowApplies: boolean;
  cancellationFeeAmount: number;
  additionalChargeAmount: number;
  selectedPaymentMethodId: string | null;
  savedPaymentMethods: SavedCard[];
  paymentMethodLast4: string | null;
  canCancel: boolean;
  requiresCharge: boolean;
  blockingReason: string | null;
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const formatStatusLabel = (value: string) =>
  value
    .toLowerCase()
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");

const getStatusClassName = (value: string) => {
  switch (value) {
    case "COMPLETED":
    case "PAID":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "SCHEDULED":
    case "RESCHEDULED":
    case "PARTIALLY_PAID":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "NO_SHOW":
    case "PAYMENT_PENDING":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "CANCELED":
    case "FAILED":
      return "border-rose-200 bg-rose-50 text-rose-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
};

const formatCardBrand = (brand: string) =>
  brand.charAt(0).toUpperCase() + brand.slice(1);

const formatCardExpiry = (expMonth: number, expYear: number) =>
  `${String(expMonth).padStart(2, "0")}/${String(expYear).slice(-2)}`;

const formatCentsAsCurrency = (amount: number) =>
  currencyFormatter.format(amount / 100);

const formatCancellationWindow = (minutes: number) => {
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return `${hours} hour${hours === 1 ? "" : "s"}`;
  }

  return `${minutes} minute${minutes === 1 ? "" : "s"}`;
};

const isCancelableAppointment = (appointment: {
  startTime: Date;
  status: string;
}) =>
  ["SCHEDULED", "RESCHEDULED"].includes(appointment.status) &&
  new Date(appointment.startTime).getTime() > Date.now();

const getChargeCardLabel = (
  card?: Pick<SavedCard, "brand" | "last4" | "expMonth" | "expYear"> | null,
  fallbackLast4?: string | null,
) => {
  if (card) {
    return `${formatCardBrand(card.brand)} •••• ${card.last4} · exp ${formatCardExpiry(card.expMonth, card.expYear)}`;
  }

  if (fallbackLast4) {
    return `Card ending in •••• ${fallbackLast4}`;
  }

  return "No saved card available";
};

const getCancellationSuccessDescription = (result: {
  chargeStatus: "CHARGED" | "NOT_NEEDED" | "NOT_CHARGED" | "SKIPPED";
  chargedAmount: number;
  paymentMethodLast4: string | null;
  cancellationWindowApplies: boolean;
}) => {
  const paymentSuffix = result.paymentMethodLast4
    ? ` to •••• ${result.paymentMethodLast4}`
    : "";

  if (result.chargeStatus === "CHARGED") {
    return `Your appointment was canceled and ${formatCentsAsCurrency(result.chargedAmount)} was charged${paymentSuffix}.`;
  }

  if (result.chargeStatus === "NOT_CHARGED") {
    return "Your appointment was canceled, but the cancellation fee could not be charged automatically.";
  }

  if (result.chargeStatus === "SKIPPED") {
    return "Your appointment was canceled without charging a cancellation fee.";
  }

  return result.cancellationWindowApplies
    ? "Your appointment was canceled. No additional cancellation fee was due."
    : "Your appointment was canceled outside the late-cancellation window.";
};

function SavedCardForm({
  defaultName,
  defaultEmail,
  defaultPhone,
  onSave,
}: Readonly<{
  defaultName?: string | null;
  defaultEmail?: string | null;
  defaultPhone?: string | null;
  onSave: (setupIntentId: string) => Promise<void>;
}>) {
  const stripe = useStripe();
  const elements = useElements();
  const [cardholderName, setCardholderName] = React.useState(defaultName ?? "");
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const { error, setupIntent } = await stripe.confirmSetup({
      elements,
      redirect: "if_required",
      confirmParams: {
        payment_method_data: {
          allow_redisplay: "always",
          billing_details: {
            name: cardholderName || undefined,
          },
        },
      },
    });

    if (error) {
      setErrorMessage(error.message || "Payment setup failed. Please try again.");
      setIsSubmitting(false);
      return;
    }

    if (setupIntent?.id) {
      try {
        await onSave(setupIntent.id);
      } catch (saveError) {
        setErrorMessage(
          saveError instanceof Error
            ? saveError.message
            : "Failed to save card. Please try again.",
        );
        setIsSubmitting(false);
        return;
      }
    }

    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="dashboard-cardholder-name">Cardholder name</Label>
        <Input
          id="dashboard-cardholder-name"
          type="text"
          autoComplete="cc-name"
          placeholder="John Doe"
          value={cardholderName}
          onChange={(event) => setCardholderName(event.target.value)}
        />
      </div>

      <PaymentElement
        options={{
          defaultValues: {
            billingDetails: {
              name: defaultName ?? undefined,
              email: defaultEmail ?? undefined,
              phone: defaultPhone ?? undefined,
            },
          },
        }}
      />

      {errorMessage ? (
        <p className="text-sm text-destructive">{errorMessage}</p>
      ) : null}

      <Button type="submit" className="w-full" size="lg" isLoading={isSubmitting}>
        Save card
      </Button>
    </form>
  );
}

function AddCardDialog({
  open,
  onOpenChange,
  organizationId,
  customerName,
  customerEmail,
  customerPhone,
  onCardSaved,
}: Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  onCardSaved: () => Promise<void>;
}>) {
  const [clientSecret, setClientSecret] = React.useState<string | null>(null);
  const [customerSessionClientSecret, setCustomerSessionClientSecret] =
    React.useState<string | null>(null);
  const [stripeAccountId, setStripeAccountId] = React.useState<string | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [isPreparing, setIsPreparing] = React.useState(false);

  const { mutateAsync: createSetupIntent } = useMutation(
    trpc.customerPayments.createSetupIntent.mutationOptions(),
  );
  const { mutateAsync: finalizeSetupIntent } = useMutation(
    trpc.customerPayments.finalizeSetupIntent.mutationOptions(),
  );

  React.useEffect(() => {
    let isMounted = true;

    const prepareSetupIntent = async () => {
      if (!open) {
        setClientSecret(null);
        setCustomerSessionClientSecret(null);
        setStripeAccountId(null);
        setLoadError(null);
        setIsPreparing(false);
        return;
      }

      try {
        setIsPreparing(true);
        setLoadError(null);

        const response = await createSetupIntent({ organizationId });

        if (!isMounted) {
          return;
        }

        setClientSecret(response.clientSecret ?? null);
        setCustomerSessionClientSecret(
          response.customerSessionClientSecret ?? null,
        );
        setStripeAccountId(response.stripeAccountId ?? null);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setLoadError(
          error instanceof Error
            ? error.message
            : "Unable to prepare a secure card form.",
        );
      } finally {
        if (isMounted) {
          setIsPreparing(false);
        }
      }
    };

    void prepareSetupIntent();

    return () => {
      isMounted = false;
    };
  }, [createSetupIntent, open, organizationId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Add a new card</DialogTitle>
          <DialogDescription>
            Save a card for faster checkout, deposits, and any policy-based
            charges with this organization.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-primary/10 p-2 text-primary">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Secure card vault</p>
              <p className="text-sm text-muted-foreground">
                Your card details are encrypted by Stripe and never stored directly
                in the portal.
              </p>
            </div>
          </div>
        </div>

        {isPreparing ? (
          <div className="space-y-4 py-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-36 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : null}

        {loadError ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            {loadError}
          </div>
        ) : null}

        {clientSecret ? (
          <Elements
            stripe={getStripe(stripeAccountId)}
            options={{
              clientSecret,
              customerSessionClientSecret:
                customerSessionClientSecret ?? undefined,
              appearance: {
                theme: "stripe",
              },
            }}
          >
            <SavedCardForm
              defaultName={customerName}
              defaultEmail={customerEmail}
              defaultPhone={customerPhone}
              onSave={async (setupIntentId) => {
                const result = await finalizeSetupIntent({
                  setupIntentId,
                  organizationId,
                });

                if (!result.card?.id) {
                  throw new Error("Stripe did not return a saved card.");
                }

                await onCardSaved();

                toast.success("Card saved", {
                  description: `${formatCardBrand(result.card.brand ?? "card")} •••• ${result.card.last4 ?? ""}`.trim(),
                });

                onOpenChange(false);
              }}
            />
          </Elements>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function CancellationNotice({
  preview,
  onOpenAddCard,
  onOpenChange,
}: Readonly<{
  preview: CancellationPreview;
  onOpenAddCard: () => void;
  onOpenChange: (open: boolean) => void;
}>) {
  if (!preview.requiresCharge) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
        {preview.cancellationWindowApplies
          ? "No additional cancellation fee is due for this appointment."
          : "You are outside the late-cancellation window, so no cancellation fee will be charged."}
      </div>
    );
  }

  if (preview.canCancel) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        If you continue, {formatCentsAsCurrency(preview.additionalChargeAmount)} will be charged before the appointment is canceled.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 text-destructive" />
          <div>
            <p className="text-sm font-medium text-foreground">
              Add a card before canceling
            </p>
            <p className="text-sm text-muted-foreground">
              {preview.blockingReason}
            </p>
          </div>
        </div>
        <Button
          onClick={() => {
            onOpenChange(false);
            onOpenAddCard();
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add card
        </Button>
      </div>
    </div>
  );
}

function CancellationPreviewBody({
  preview,
  isLoading,
  errorMessage,
  onRetry,
  onOpenAddCard,
  onOpenChange,
}: Readonly<{
  preview: CancellationPreview | undefined;
  isLoading: boolean;
  errorMessage?: string;
  onRetry: () => void;
  onOpenAddCard: () => void;
  onOpenChange: (open: boolean) => void;
}>) {
  if (isLoading) {
    return (
      <div className="space-y-4 py-2">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 text-destructive" />
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-foreground">
                We couldn&apos;t prepare the cancellation details.
              </p>
              <p className="text-sm text-muted-foreground">{errorMessage}</p>
            </div>
            <Button variant="outline" onClick={onRetry}>
              Try again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!preview) {
    return null;
  }

  const selectedCard =
    preview.savedPaymentMethods.find(
      (card) => card.id === preview.selectedPaymentMethodId,
    ) ?? null;
  const hasCardForCharge = Boolean(selectedCard || preview.paymentMethodLast4);
  const chargeCardLabel = getChargeCardLabel(
    selectedCard,
    preview.paymentMethodLast4,
  );

  return (
    <div className="space-y-4 py-2">
      <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">
              {format(preview.startTime, "EEEE, MMM d")}
            </p>
            <p className="text-sm text-muted-foreground">
              {format(preview.startTime, "h:mm a")} – {format(preview.endTime, "h:mm a")}
            </p>
            <p className="text-sm text-muted-foreground">{preview.location.name}</p>
          </div>
          <div className="flex flex-wrap gap-2 sm:justify-end">
            {preview.serviceNames.map((serviceName) => (
              <Badge key={`${preview.appointmentId}-${serviceName}`} variant="secondary">
                {serviceName}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-border/60 p-4">
          <div className="space-y-3">
            <div>
              <p className="text-sm font-semibold text-foreground">
                Cancellation policy
              </p>
              <p className="text-sm text-muted-foreground">
                Late cancellations within {formatCancellationWindow(preview.cancellationDuration)} of the appointment start can be charged {preview.cancellationPercent}% of the discounted total.
              </p>
            </div>

            <Separator />

            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Booked total</span>
                <span>{formatCentsAsCurrency(preview.totalAmount)}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Discount</span>
                <span>-{formatCentsAsCurrency(preview.discountAmount)}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Discounted total</span>
                <span>{formatCentsAsCurrency(preview.discountedTotalAmount)}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Already collected</span>
                <span>{formatCentsAsCurrency(preview.alreadyChargedAmount)}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Cancellation fee total</span>
                <span>{formatCentsAsCurrency(preview.cancellationFeeAmount)}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between gap-4 font-semibold text-foreground">
                <span>Charge now</span>
                <span>{formatCentsAsCurrency(preview.additionalChargeAmount)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border/60 p-4">
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "rounded-full p-2",
                  hasCardForCharge
                    ? "bg-primary/10 text-primary"
                    : "bg-destructive/10 text-destructive",
                )}
              >
                {hasCardForCharge ? (
                  <CreditCard className="h-4 w-4" />
                ) : (
                  <AlertTriangle className="h-4 w-4" />
                )}
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">
                  Card to be charged
                </p>
                <p className="text-sm text-muted-foreground">{chargeCardLabel}</p>
                {!hasCardForCharge && preview.requiresCharge ? (
                  <p className="text-sm text-destructive">
                    Add a card to pay the cancellation fee before canceling.
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <CancellationNotice
            preview={preview}
            onOpenAddCard={onOpenAddCard}
            onOpenChange={onOpenChange}
          />
        </div>
      </div>
    </div>
  );
}

function CancelAppointmentDialog({
  open,
  onOpenChange,
  appointmentId,
  organizationId,
  onOpenAddCard,
}: Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentId: string | null;
  organizationId: string;
  onOpenAddCard: () => void;
}>) {
  const queryClient = useQueryClient();
  const cancellationPreviewQuery = useQuery({
    ...trpc.customerAuth.getAppointmentCancellationPreview.queryOptions({
      appointmentId: appointmentId ?? "",
      organizationId,
    }),
    enabled: open && Boolean(appointmentId),
  });
  const { mutate: cancelAppointment, isPending: isCanceling } = useMutation(
    trpc.customerAuth.cancelAppointment.mutationOptions({
      onSuccess: async (result) => {
        if (!appointmentId) {
          return;
        }

        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: trpc.customerAuth.getPortalOverview.queryKey({
              organizationId,
            }),
          }),
          queryClient.invalidateQueries({
            queryKey: trpc.customerAuth.getAppointmentCancellationPreview.queryKey(
              {
                appointmentId,
                organizationId,
              },
            ),
          }),
        ]);

        onOpenChange(false);

        toast.success("Appointment canceled", {
          description: getCancellationSuccessDescription(result),
        });
      },
      onError: (error) => {
        toast.error(error.message || "Unable to cancel appointment");
      },
    }),
  );

  const preview = cancellationPreviewQuery.data;
  const confirmLabel = preview?.requiresCharge
    ? `Charge ${formatCentsAsCurrency(preview.additionalChargeAmount)} & cancel`
    : "Cancel appointment";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Cancel appointment</DialogTitle>
          <DialogDescription>
            Review the cancellation policy before you confirm. If a fee applies,
            your saved card will be charged before the appointment is canceled.
          </DialogDescription>
        </DialogHeader>

        <CancellationPreviewBody
          preview={preview}
          isLoading={cancellationPreviewQuery.isLoading}
          errorMessage={cancellationPreviewQuery.error?.message}
          onRetry={() => {
            void cancellationPreviewQuery.refetch();
          }}
          onOpenAddCard={onOpenAddCard}
          onOpenChange={onOpenChange}
        />

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isCanceling}
          >
            Keep appointment
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={
              !preview ||
              cancellationPreviewQuery.isLoading ||
              isCanceling ||
              !preview.canCancel
            }
            onClick={() => {
              if (!appointmentId) {
                return;
              }

              cancelAppointment({
                appointmentId,
                organizationId,
              });
            }}
          >
            {isCanceling ? "Canceling..." : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UpcomingAppointmentSection({
  organizationId,
  organizationName,
  upcomingAppointment,
  onCancel,
}: Readonly<{
  organizationId: string;
  organizationName: string;
  upcomingAppointment: PortalAppointment | null;
  onCancel: (appointmentId: string) => void;
}>) {
  if (!upcomingAppointment) {
    return null;
  }

  const canCancel = isCancelableAppointment(upcomingAppointment);

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Coming up
        </p>
        <CardTitle>Next appointment</CardTitle>
        <CardDescription>
          Your next confirmed visit with {organizationName}.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className={cn("border", getStatusClassName(upcomingAppointment.status))}
            >
              {formatStatusLabel(upcomingAppointment.status)}
            </Badge>
            <Badge
              variant="outline"
              className={cn(
                "border",
                getStatusClassName(upcomingAppointment.paymentStatus),
              )}
            >
              {formatStatusLabel(upcomingAppointment.paymentStatus)}
            </Badge>
          </div>
          <div>
            <p className="text-2xl font-semibold tracking-tight text-foreground">
              {format(upcomingAppointment.startTime, "EEEE, MMM d")}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {format(upcomingAppointment.startTime, "h:mm a")} – {format(upcomingAppointment.endTime, "h:mm a")}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {upcomingAppointment.serviceNames.map((serviceName: string) => (
              <Badge key={`${upcomingAppointment.id}-${serviceName}`} variant="secondary">
                {serviceName}
              </Badge>
            ))}
          </div>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href={`/widget/${organizationId}/book`}
              className={buttonVariants({ variant: "outline" })}
            >
              Rebook
            </Link>
            {canCancel ? (
              <Button
                variant="destructive"
                onClick={() => {
                  onCancel(upcomingAppointment.id);
                }}
              >
                Cancel appointment
              </Button>
            ) : null}
          </div>
        </div>
        <div className="space-y-3 rounded-2xl border border-border/60 bg-muted/20 p-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Location
            </p>
            <p className="mt-1 font-medium text-foreground">
              {upcomingAppointment.location.name}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Time zone
            </p>
            <p className="mt-1 font-medium text-foreground">
              {upcomingAppointment.location.timeZone ?? "Not specified"}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Expected total
            </p>
            <p className="mt-1 font-medium text-foreground">
              {formatCentsAsCurrency(upcomingAppointment.price)}
            </p>
          </div>
          {canCancel ? (
            <div className="rounded-xl border border-border/60 bg-background/80 p-3 text-sm text-muted-foreground">
              If a late-cancellation fee applies, you&apos;ll review the amount and
              the card that will be charged before confirming.
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function RecentAppointmentsSection({
  organizationId,
  organizationName,
  appointments,
  onCancel,
}: Readonly<{
  organizationId: string;
  organizationName: string;
  appointments: PortalAppointment[];
  onCancel: (appointmentId: string) => void;
}>) {
  if (appointments.length === 0) {
    return <EmptyAppointmentsState organizationId={organizationId} />;
  }

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          History
        </p>
        <CardTitle>Recent appointments</CardTitle>
        <CardDescription>
          A snapshot of your latest bookings with {organizationName}.
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Services</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {appointments.map((appointment) => (
              <TableRow key={appointment.id}>
                <TableCell>
                  <div>
                    <p className="font-medium text-foreground">
                      {format(appointment.startTime, "MMM d, yyyy")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(appointment.startTime, "h:mm a")} – {format(appointment.endTime, "h:mm a")}
                    </p>
                  </div>
                </TableCell>
                <TableCell>{appointment.location.name}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-2">
                    {appointment.serviceNames.map((serviceName: string) => (
                      <Badge key={`${appointment.id}-${serviceName}`} variant="secondary">
                        {serviceName}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn("border", getStatusClassName(appointment.status))}
                  >
                    {formatStatusLabel(appointment.status)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn(
                      "border",
                      getStatusClassName(appointment.paymentStatus),
                    )}
                  >
                    {formatStatusLabel(appointment.paymentStatus)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCentsAsCurrency(appointment.price)}
                </TableCell>
                <TableCell className="text-right">
                  {isCancelableAppointment(appointment) ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        onCancel(appointment.id);
                      }}
                    >
                      Review cancel
                    </Button>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function DashboardStatCard({
  label,
  value,
  description,
  icon: Icon,
}: Readonly<{
  label: string;
  value: string;
  description: string;
  icon: typeof CalendarDays;
}>) {
  return (
    <Card className="border-border/60 shadow-sm transition-colors hover:border-border">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
        <div className="rounded-md border border-border/60 bg-muted/40 p-1.5">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold tracking-tight text-foreground">
          {value}
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function EmptyAppointmentsState({ organizationId }: Readonly<{ organizationId: string }>) {
  return (
    <Card className="border-border/60 shadow-sm">
      <CardContent className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <div className="rounded-full bg-primary/10 p-3 text-primary">
          <CalendarDays className="h-6 w-6" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-foreground">No appointments yet</h3>
          <p className="max-w-md text-sm text-muted-foreground">
            Once you book with this organization, your upcoming and past visits will
            appear here.
          </p>
        </div>
        <Link
          href={`/widget/${organizationId}/book`}
          className={buttonVariants({ variant: "default" })}
        >
          <Plus className="mr-2 h-4 w-4" />
          Book an appointment
        </Link>
      </CardContent>
    </Card>
  );
}

export function CustomerPortalDashboard({ organizationId }: CustomerPortalDashboardProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isAddCardOpen, setIsAddCardOpen] = React.useState(false);
  const [appointmentPendingCancellationId, setAppointmentPendingCancellationId] =
    React.useState<string | null>(null);
  const [cardPendingRemoval, setCardPendingRemoval] = React.useState<SavedCard | null>(
    null,
  );
  const portalQuery = useQuery(
    trpc.customerAuth.getPortalOverview.queryOptions({ organizationId }),
  );
  const savedCardsQuery = useQuery({
    ...trpc.customerPayments.getSavedCards.queryOptions({ organizationId }),
    enabled: Boolean(portalQuery.data),
  });
  const { mutateAsync: logout, isPending: isLoggingOut } = useMutation(
    trpc.customerAuth.logout.mutationOptions(),
  );
  const { mutateAsync: removeSavedCard, isPending: isRemovingSavedCard } =
    useMutation(trpc.customerPayments.removeSavedCard.mutationOptions());

  const invalidateSavedCards = React.useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: trpc.customerPayments.getSavedCards.queryKey({ organizationId }),
    });
  }, [organizationId, queryClient]);

  React.useEffect(() => {
    if (!portalQuery.error) {
      return;
    }

    const returnPath = globalThis.window.location.pathname;
    router.replace(
      `/c/${organizationId}/login?return=${encodeURIComponent(returnPath)}`,
    );
  }, [organizationId, portalQuery.error, router]);

  if (portalQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Card className="border-border/60 shadow-sm">
          <CardContent className="flex min-h-[120px] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }, (_, idx) => (
            <Card key={idx} className="border-border/60 shadow-sm">
              <CardContent className="h-[120px] animate-pulse rounded-xl bg-muted/40" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!portalQuery.data) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Card className="w-full max-w-md border-border/60 shadow-sm">
          <CardContent className="space-y-4 p-6 text-center">
            <p className="font-medium text-foreground">Unable to load your portal</p>
            <p className="text-sm text-muted-foreground">
              Please sign in again for this organization.
            </p>
            <Link
              href={`/c/${organizationId}/login`}
              className={buttonVariants({ variant: "default" })}
            >
              Go to login
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { organization, customer, stats, upcomingAppointment, appointments } =
    portalQuery.data;
  const savedCards = savedCardsQuery.data?.allSavedCards ?? [];
  const user = customer.user;
  const userInitials = user.name
    ? user.name
        .split(" ")
        .map((part: string) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : user.email.slice(0, 2).toUpperCase();

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-border/60 bg-gradient-to-br from-primary/10 via-background to-background shadow-sm">
        <CardContent className="flex flex-col gap-6 p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16 border bg-background shadow-sm">
              <AvatarImage src={user.image ?? ""} alt={user.name ?? user.email} />
              <AvatarFallback>{userInitials}</AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <div>
                <p className="text-sm font-medium text-primary">Customer Portal</p>
                <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                  Welcome back{user.name ? `, ${user.name.split(" ")[0]}` : ""}
                </h1>
              </div>
              <p className="max-w-2xl text-sm text-muted-foreground">
                Review your appointments with {organization.name}, manage your
                portal access, and jump back into booking whenever you are ready.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Badge variant="secondary" className="border-border/60 bg-background/90">
                  {organization.name}
                </Badge>
                <Badge variant="outline" className="border-border/60 bg-background/80">
                  <UserRound className="mr-1.5 h-3.5 w-3.5" />
                  {user.email}
                </Badge>
                {customer.phoneNumber ? (
                  <Badge variant="outline" className="border-border/60 bg-background/80">
                    <CreditCard className="mr-1.5 h-3.5 w-3.5" />
                    {customer.phoneNumber}
                  </Badge>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/widget/${organizationId}/book`}
              className={buttonVariants({ variant: "default" })}
            >
              <Plus className="mr-2 h-4 w-4" />
              Book again
            </Link>
            <Button
              variant="outline"
              isLoading={isLoggingOut}
              onClick={() => {
                void logout().then(() => {
                  router.push(`/c/${organizationId}/login`);
                  router.refresh();
                });
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Overview
        </p>
        <div className="grid gap-4 md:grid-cols-3">
          <DashboardStatCard
            label="Total appointments"
            value={String(stats.totalAppointments)}
            description="All bookings tied to this organization."
            icon={CalendarDays}
          />
          <DashboardStatCard
            label="Upcoming visits"
            value={String(stats.upcomingAppointmentsCount)}
            description="Scheduled appointments still ahead of you."
            icon={Clock3}
          />
          <DashboardStatCard
            label="Completed visits"
            value={String(stats.completedAppointmentsCount)}
            description="Finished appointments with this organization."
            icon={MapPin}
          />
        </div>
      </div>

      <Card className="border-border/60 shadow-sm">
        <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Payments
            </p>
            <CardTitle>Manage cards</CardTitle>
            <CardDescription>
              Save a preferred card for faster booking, downpayments, and
              automatic cancellation-fee charges when policy applies.
            </CardDescription>
          </div>
          <Button onClick={() => setIsAddCardOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add card
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {savedCardsQuery.isLoading ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {Array.from({ length: 2 }, (_, index) => (
                <Card key={index} className="border-border/60 shadow-none">
                  <CardContent className="space-y-3 p-5">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-9 w-24" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : null}

          {savedCardsQuery.error ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 text-destructive" />
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      We couldn&apos;t load your saved cards.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {savedCardsQuery.error.message}
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => void savedCardsQuery.refetch()}>
                    Try again
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          {!savedCardsQuery.isLoading && !savedCardsQuery.error && savedCards.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 p-8 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <CreditCard className="h-5 w-5" />
              </div>
              <div className="mt-4 space-y-2">
                <h3 className="text-lg font-semibold text-foreground">No saved cards yet</h3>
                <p className="mx-auto max-w-md text-sm text-muted-foreground">
                  Add a card now so future bookings feel instant and any deposits or
                  no-show policies can be handled smoothly.
                </p>
              </div>
              <Button className="mt-5" onClick={() => setIsAddCardOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add your first card
              </Button>
            </div>
          ) : null}

          {!savedCardsQuery.isLoading && !savedCardsQuery.error && savedCards.length > 0 ? (
            <>
              <div className="grid gap-4 lg:grid-cols-2">
                {savedCards.map((card) => (
                  <Card
                    key={card.id}
                    className={cn(
                      "border-border/60 shadow-none transition-colors",
                      card.isDefault && "border-primary/40 bg-primary/5",
                    )}
                  >
                    <CardContent className="space-y-4 p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className="rounded-xl border border-border/60 bg-background p-2.5 shadow-sm">
                            <CreditCard className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold text-foreground">
                                {formatCardBrand(card.brand)} ending in {card.last4}
                              </p>
                              {card.isDefault ? (
                                <Badge variant="secondary">Default</Badge>
                              ) : null}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Expires {formatCardExpiry(card.expMonth, card.expYear)}
                            </p>
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-destructive"
                          disabled={isRemovingSavedCard}
                          onClick={() => setCardPendingRemoval(card)}
                        >
                          <Trash2 className="h-4 w-4" />
                          Remove
                        </Button>
                      </div>

                      <Separator />

                      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                        <p className="text-muted-foreground">
                          {card.isDefault
                            ? "This card is used first for bookings and any policy-based charges."
                            : "You can still select this card during checkout."}
                        </p>
                        {card.isDefault ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            Preferred card
                          </span>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground">
                Removing a default card will automatically move the default badge to
                another saved card, if one is available.
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>

      <UpcomingAppointmentSection
        organizationId={organizationId}
        organizationName={organization.name}
        upcomingAppointment={upcomingAppointment}
        onCancel={setAppointmentPendingCancellationId}
      />

      <RecentAppointmentsSection
        organizationId={organizationId}
        organizationName={organization.name}
        appointments={appointments}
        onCancel={setAppointmentPendingCancellationId}
      />

      <AddCardDialog
        open={isAddCardOpen}
        onOpenChange={setIsAddCardOpen}
        organizationId={organizationId}
        customerName={user.name}
        customerEmail={user.email}
        customerPhone={customer.phoneNumber}
        onCardSaved={async () => {
          await invalidateSavedCards();

          if (appointmentPendingCancellationId) {
            await queryClient.invalidateQueries({
              queryKey: trpc.customerAuth.getAppointmentCancellationPreview.queryKey(
                {
                  appointmentId: appointmentPendingCancellationId,
                  organizationId,
                },
              ),
            });
          }
        }}
      />

      <CancelAppointmentDialog
        open={Boolean(appointmentPendingCancellationId)}
        onOpenChange={(open) => {
          if (!open) {
            setAppointmentPendingCancellationId(null);
          }
        }}
        appointmentId={appointmentPendingCancellationId}
        organizationId={organizationId}
        onOpenAddCard={() => {
          setIsAddCardOpen(true);
        }}
      />

      <AlertDialog
        open={Boolean(cardPendingRemoval)}
        onOpenChange={(open) => {
          if (!open) {
            setCardPendingRemoval(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this card?</AlertDialogTitle>
            <AlertDialogDescription>
              {cardPendingRemoval
                ? `This removes ${formatCardBrand(cardPendingRemoval.brand)} ending in ${cardPendingRemoval.last4} from your saved payment methods.`
                : "This removes the selected card from your saved payment methods."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemovingSavedCard}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={isRemovingSavedCard || !cardPendingRemoval}
              onClick={(event) => {
                event.preventDefault();

                if (!cardPendingRemoval) {
                  return;
                }

                void removeSavedCard({
                  organizationId,
                  paymentMethodId: cardPendingRemoval.id,
                })
                  .then(async (result) => {
                    await invalidateSavedCards();
                    setCardPendingRemoval(null);

                    toast.success("Card removed", {
                      description:
                        result.allSavedCards.length > 0
                          ? "Your saved cards list is up to date."
                          : "You have no saved cards left for this organization.",
                    });
                  })
                  .catch((error) => {
                    toast.error(
                      error instanceof Error
                        ? error.message
                        : "Failed to remove card",
                    );
                  });
              }}
            >
              {isRemovingSavedCard ? "Removing..." : "Remove card"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
