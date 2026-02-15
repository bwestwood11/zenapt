"use client";

import React from "react";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock } from "lucide-react";
import { ProtectedStep } from "./protected-step";
import getStripe from "@/lib/stripe/config";
import { trpc } from "@/utils/trpc";
import { useMutation } from "@tanstack/react-query";
import { useOrgId } from "../hooks/useOrgId";
import { useCustomerSession } from "../hooks/useCustomerSession";
import { useCheckoutStore } from "../hooks/useStore";

const SetupIntentForm = ({
  onFinalize,
  defaultName,
  defaultEmail,
  defaultPhone,
}: {
  onFinalize: (setupIntentId: string) => Promise<{
    brand: string | null;
    last4: string | null;
  } | null>;
  defaultName?: string | null;
  defaultEmail?: string | null;
  defaultPhone?: string | null;
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [cardholderName, setCardholderName] = React.useState(defaultName ?? "");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [isSaved, setIsSaved] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      setErrorMessage(error.message || "Payment setup failed. Try again.");
      setIsSubmitting(false);
      return;
    }

    if (
      setupIntent?.status === "succeeded" ||
      setupIntent?.status === "processing"
    ) {
      if (setupIntent.id) {
        try {
          await onFinalize(setupIntent.id);
        } catch (finalizeError) {
          setErrorMessage(
            finalizeError instanceof Error
              ? finalizeError.message
              : "Failed to save card. Please try again.",
          );
          setIsSubmitting(false);
          return;
        }
      }

      setIsSaved(true);
    }

    setIsSubmitting(false);
  };

  return (
    <form
      id="payment-save-card-form"
      onSubmit={handleSubmit}
      className="space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor="cardholderName">Cardholder Name</Label>
        <Input
          id="cardholderName"
          type="text"
          placeholder="John Doe"
          value={cardholderName}
          onChange={(e) => setCardholderName(e.target.value)}
          autoComplete="cc-name"
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

      {errorMessage && (
        <div className="text-sm text-destructive">{errorMessage}</div>
      )}

      {isSaved && (
        <div className="text-sm text-primary">Card saved successfully.</div>
      )}

      <Button
        type="submit"
        className="w-full"
        size="lg"
        disabled={isSubmitting || isSaved}
      >
        {isSaved ? "Card Saved" : isSubmitting ? "Saving Card..." : "Save Card"}
      </Button>
    </form>
  );
};

const PaymentPage = () => {
  const orgId = useOrgId();
  const session = useCustomerSession();
  const location = useCheckoutStore((state) => state.location);
  const cart = useCheckoutStore((state) => state.cart);
  const appointmentTime = useCheckoutStore((state) => state.appointmentTime);

  const [clientSecret, setClientSecret] = React.useState<string | null>(null);
  const [customerSessionClientSecret, setCustomerSessionClientSecret] =
    React.useState<string | null>(null);
  const [stripeAccountId, setStripeAccountId] = React.useState<string | null>(
    null,
  );
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isBooking, setIsBooking] = React.useState(false);
  const [bookingError, setBookingError] = React.useState<string | null>(null);
  const [bookingSuccess, setBookingSuccess] = React.useState(false);

  const [savedCard, setSavedCard] = React.useState<{
    brand?: string | null;
    last4?: string | null;
  } | null>(null);

  const { mutateAsync: createSetupIntent } = useMutation(
    trpc.customerPayments.createSetupIntent.mutationOptions(),
  );
  const { mutateAsync: finalizeSetupIntent } = useMutation(
    trpc.customerPayments.finalizeSetupIntent.mutationOptions(),
  );
  const { mutateAsync: createAppointment } = useMutation(
    trpc.customerPayments.createAppointment.mutationOptions(),
  );

  React.useEffect(() => {
    let isMounted = true;

    const loadSetupIntent = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);

        const data = await createSetupIntent({
          organizationId: orgId,
        });

        if (isMounted) {
          setClientSecret(data.clientSecret ?? null);
          setSavedCard(data.savedCard ?? null);
          setCustomerSessionClientSecret(
            data.customerSessionClientSecret ?? null,
          );
          setStripeAccountId(data.stripeAccountId ?? null);
        }
      } catch (error) {
        if (isMounted) {
          setLoadError(
            error instanceof Error ? error.message : "Something went wrong.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    if (session?.data?.customer) {
      loadSetupIntent();
    } else if (!session?.isLoading) {
      setIsLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [createSetupIntent, orgId, session?.data?.customer, session?.isLoading]);

  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (bookingSuccess) {
      return;
    }

    setBookingError(null);

    if (!savedCard?.last4) {
      setBookingError("Please save your card before booking the appointment.");
      return;
    }

    if (!location || !appointmentTime) {
      setBookingError(
        "Missing appointment details. Please select a time again.",
      );
      return;
    }

    const selectedServiceIds = cart
      .map((item) => item.employeeServiceId)
      .filter((value): value is string => Boolean(value));

    if (selectedServiceIds.length !== cart.length) {
      setBookingError(
        "Please select a professional for each service before continuing.",
      );
      return;
    }

    const selectedLocationEmployeeIds = Array.from(
      new Set(
        cart
          .map((item) => item.employeeId)
          .filter((value): value is string => Boolean(value)),
      ),
    );

    if (selectedLocationEmployeeIds.length !== 1) {
      setBookingError(
        "All selected services must be with the same professional to book one appointment.",
      );
      return;
    }

    const addOnIds = Array.from(
      new Set(
        cart.flatMap((item) => (item.addons ?? []).map((addOn) => addOn.id)),
      ),
    );

    setIsBooking(true);
    try {
      await createAppointment({
        organizationId: orgId,
        locationId: location,
        locationEmployeeId: selectedLocationEmployeeIds[0],
        serviceIds: selectedServiceIds,
        addOnIds: addOnIds.length > 0 ? addOnIds : undefined,
        startTime: appointmentTime.start,
        endTime: appointmentTime.end,
      });

      setBookingSuccess(true);
    } catch (error) {
      setBookingError(
        error instanceof Error ? error.message : "Failed to book appointment.",
      );
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <ProtectedStep>
      <div className="max-w-md mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-semibold text-foreground">Payment</h2>
          <p className="text-muted-foreground text-sm">
            Enter your payment details to complete your booking
          </p>
        </div>

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mb-4"></div>
            <p className="text-sm text-muted-foreground">
              Preparing secure payment form...
            </p>
          </div>
        )}

        {loadError && (
          <div className="text-sm text-destructive text-center">
            {loadError}
          </div>
        )}

        {savedCard?.last4 && (
          <div className="text-sm text-muted-foreground text-center">
            Saved {savedCard.brand ? savedCard.brand + " " : ""}card ending in{" "}
            {savedCard.last4}
          </div>
        )}

        {bookingError && (
          <div className="text-sm text-destructive text-center">
            {bookingError}
          </div>
        )}

        {bookingSuccess && (
          <div className="text-sm text-primary text-center">
            Appointment created successfully.
          </div>
        )}

        {clientSecret && (
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
            <div className="p-4 rounded-lg bg-muted/50 border border-border flex items-start gap-3">
              <Lock className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  Secure Payment
                </p>
                <p className="text-xs text-muted-foreground">
                  Your payment information is encrypted and secure
                </p>
              </div>
            </div>

            <SetupIntentForm
              defaultName={session?.data?.user?.name ?? null}
              defaultEmail={session?.data?.user?.email ?? null}
              defaultPhone={session?.data?.customer?.phoneNumber ?? null}
              onFinalize={async (setupIntentId) => {
                const result = await finalizeSetupIntent({
                  setupIntentId,
                  organizationId: orgId,
                });

                if (result?.card?.last4) {
                  const nextCard = {
                    brand: result.card.brand ?? null,
                    last4: result.card.last4 ?? null,
                  };
                  setSavedCard(nextCard);
                  return nextCard;
                }

                return null;
              }}
            />
          </Elements>
        )}

        <form
          id="payment-book-appointment-form"
          onSubmit={handleBookAppointment}
        >
          <input type="hidden" name="bookAppointment" value="1" />
          <button
            type="submit"
            style={{ display: "none" }}
            disabled={isBooking || bookingSuccess}
            aria-hidden
            tabIndex={-1}
          />
        </form>

        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            You will receive a confirmation email after booking
          </p>
        </div>
      </div>
    </ProtectedStep>
  );
};

export default PaymentPage;
