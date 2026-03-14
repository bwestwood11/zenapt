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
import { Lock, CreditCard } from "lucide-react";
import { ProtectedStep } from "./protected-step";
import getStripe from "@/lib/stripe/config";
import { trpc } from "@/utils/trpc";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useOrgId } from "../hooks/useOrgId";
import { useCustomerSession } from "../hooks/useCustomerSession";
import { useCheckoutStore, StepIds } from "../hooks/useStore";
import {
  formatShortDateTimeInTimeZone,
  getLocalTimeZone,
  shouldShowLocationTime,
} from "../utils/timezone-display";

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

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
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

      <Button
        type="submit"
        className="w-full"
        size="lg"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Saving Card..." : "Save Card"}
      </Button>
    </form>
  );
};

const PaymentPage = () => {
  const orgId = useOrgId();
  const session = useCustomerSession();
  const location = useCheckoutStore((state) => state.location);
  const locationTimeZone = useCheckoutStore((state) => state.locationTimeZone);
  const cart = useCheckoutStore((state) => state.cart);
  const appointmentTime = useCheckoutStore((state) => state.appointmentTime);
  const localTimeZone = getLocalTimeZone();
  const effectiveLocationTimeZone = locationTimeZone ?? localTimeZone;
  const showLocationDateTime =
    !!appointmentTime &&
    shouldShowLocationTime(
      appointmentTime.start,
      appointmentTime.end,
      localTimeZone,
      effectiveLocationTimeZone,
    );
  const setStep = useCheckoutStore((state) => state.setStep);

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
  const [promoCodeInput, setPromoCodeInput] = React.useState("");
  const [appliedPromoCode, setAppliedPromoCode] = React.useState<string | null>(
    null,
  );
  const [promoDiscountAmount, setPromoDiscountAmount] = React.useState(0);
  const [promoError, setPromoError] = React.useState<string | null>(null);

  const [savedCard, setSavedCard] = React.useState<{
    id?: string | null;
    brand?: string | null;
    last4?: string | null;
  } | null>(null);
  const [allSavedCards, setAllSavedCards] = React.useState<
    Array<{
      id: string;
      brand: string;
      last4: string;    
      expMonth: number;
      expYear: number;
    }>
  >([]);
  const [selectedCardId, setSelectedCardId] = React.useState<string | null>(
    null,
  );
  const [useNewCard, setUseNewCard] = React.useState(false);

  const totalAmount = React.useMemo(() => {
    return cart.reduce((sum, item) => {
      const servicePrice =  item.servicePrice ? item.servicePrice / 100 : 0;
      const addonsPrice = (item.addons ?? []).reduce(
        (addonSum, addon) => addonSum + (addon.price ? addon.price / 100 : 0),
        0,
      );
      return sum + servicePrice + addonsPrice;
    }, 0);
  }, [cart]);

  const formatUSD = React.useCallback((amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  }, []);

  const { data: bookingPolicy } = useQuery({
    ...trpc.public.getLocationBookingPolicy.queryOptions({
      locationId: location ?? "",
    }),
    enabled: !!location,
  });

  const cancellationPercent = bookingPolicy?.cancellationPercent ?? 100;
  const cancellationDuration = bookingPolicy?.cancellationDuration ?? 60;
  const downpaymentPercentage = bookingPolicy?.downpaymentPercentage ?? 0;
  const discountedTotalAmount = Math.max(0, totalAmount - promoDiscountAmount);
  const amountDueNow =
    downpaymentPercentage > 0
      ? Number(
          ((discountedTotalAmount * downpaymentPercentage) / 100).toFixed(2),
        )
      : 0;

  const formatDurationLabel = React.useCallback((minutes: number) => {
    if (minutes % 60 === 0) {
      const hours = minutes / 60;
      return `${hours} hour${hours === 1 ? "" : "s"}`;
    }
    return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  }, []);

  const { mutateAsync: createSetupIntent } = useMutation(
    trpc.customerPayments.createSetupIntent.mutationOptions(),
  );
  const { mutateAsync: finalizeSetupIntent } = useMutation(
    trpc.customerPayments.finalizeSetupIntent.mutationOptions(),
  );
  const { mutateAsync: createAppointment } = useMutation(
    trpc.customerPayments.createAppointment.mutationOptions(),
  );
  const { mutateAsync: validatePromoCode, isPending: isValidatingPromoCode } =
    useMutation(trpc.public.validatePromoCode.mutationOptions());

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
          setAllSavedCards(data.allSavedCards ?? []);
          setSelectedCardId(data.savedCard?.id ?? null);
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

  React.useEffect(() => {
    setAppliedPromoCode(null);
    setPromoDiscountAmount(0);
    setPromoError(null);
  }, [location, totalAmount]);

  const handleApplyPromoCode = async () => {
    const normalizedCode = promoCodeInput.trim().toUpperCase();

    if (!normalizedCode) {
      setPromoError("Enter a coupon code.");
      return;
    }

    if (!location) {
      setPromoError("Select a location before applying coupon.");
      return;
    }

    setPromoError(null);

    try {
      const result = await validatePromoCode({
        locationId: location,
        code: normalizedCode,
        totalAmount: Math.round(totalAmount * 100),
      });

      setAppliedPromoCode(result.code);
      setPromoDiscountAmount(result.discountAmount / 100);
      setPromoCodeInput(result.code);
    } catch (error) {
      setAppliedPromoCode(null);
      setPromoDiscountAmount(0);
      setPromoError(
        error instanceof Error ? error.message : "Unable to apply coupon.",
      );
    }
  };

  const handleRemovePromoCode = () => {
    setAppliedPromoCode(null);
    setPromoDiscountAmount(0);
    setPromoError(null);
    setPromoCodeInput("");
  };

  const handleBookAppointment = async (e?: React.MouseEvent<HTMLButtonElement>) => {
    e?.preventDefault();

    if (bookingSuccess) {
      return;
    }

    setBookingError(null);

    if (!selectedCardId) {
      setBookingError("Please select a payment method before booking.");
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
        paymentMethodId: selectedCardId,
        promoCode: appliedPromoCode ?? undefined,
      });

      setBookingSuccess(true);
      
      // Store saved card info for confirmation page
      const cardToStore = allSavedCards.find((c) => c.id === selectedCardId);
      if (globalThis.window !== undefined && cardToStore) {
        sessionStorage.setItem("savedCard", JSON.stringify(cardToStore));
      }
      
      // Navigate to confirmation page
      setTimeout(() => {
        setStep(StepIds.CONFIRMATION);
      }, 1500);
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

        {allSavedCards.length > 0 && !useNewCard && (
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-foreground">
              Select Payment Method
            </h3>
            <div className="space-y-3">
              {allSavedCards.map((card) => (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => setSelectedCardId(card.id)}
                  className={`w-full p-4 rounded-lg border-2 transition-all ${
                    selectedCardId === card.id
                      ? "border-primary bg-primary/5 shadow-md"
                      : "border-border hover:border-primary/50 hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg ${
                        selectedCardId === card.id
                          ? "bg-primary/20"
                          : "bg-muted"
                      }`}
                    >
                      <CreditCard
                        className={`h-5 w-5 ${
                          selectedCardId === card.id
                            ? "text-primary"
                            : "text-muted-foreground"
                        }`}
                      />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-semibold text-foreground capitalize">
                        {card.brand}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">
                        •••• {card.last4}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        Expires {card.expMonth}/{card.expYear % 100}
                      </p>
                      {selectedCardId === card.id && (
                        <div className="mt-1">
                          <svg
                            className="h-5 w-5 text-primary"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              size="sm"
              onClick={() => setUseNewCard(true)}
            >
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Add a New Card
            </Button>
          </div>
        )}

        {bookingError && (
          <div className="text-sm text-destructive text-center">
            {bookingError}
          </div>
        )}

        {bookingSuccess && (
          <div className="p-6 rounded-lg bg-primary/10 border border-primary space-y-4">
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold text-primary">
                Appointment Booked! ✓
              </h3>
              <p className="text-sm text-muted-foreground">
                Your appointment has been successfully confirmed
              </p>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Services:</span>
                <span className="font-medium text-foreground">
                  {cart.length} service{cart.length === 1 ? "" : "s"}
                </span>
              </div>
              {appointmentTime && (
                <div className="flex justify-between items-start">
                  <span className="text-muted-foreground">Time:</span>
                  <span className="font-medium text-foreground text-right">
                    <span className="block">
                      Location time: {formatShortDateTimeInTimeZone(appointmentTime.start, effectiveLocationTimeZone)}
                    </span>
                    {showLocationDateTime && (
                      <span className="block text-xs text-muted-foreground mt-0.5">
                        Your local time: {formatShortDateTimeInTimeZone(appointmentTime.start, localTimeZone)}
                      </span>
                    )}
                  </span>
                </div>
              )}
              {savedCard?.last4 && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Payment:</span>
                  <span className="font-medium text-foreground">
                    {savedCard.brand
                      ? `${savedCard.brand.charAt(0).toUpperCase() + savedCard.brand.slice(1)} `
                      : "Card "}
                    ••••{savedCard.last4}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {clientSecret && (allSavedCards.length === 0 || useNewCard) && (
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
                    id: result.card.id ?? null,
                    brand: result.card.brand ?? null,
                    last4: result.card.last4 ?? null,
                  };
                  setSavedCard(nextCard);
                  setAllSavedCards((prev) => [
                    {
                      id: result.card.id!,
                      brand: result.card.brand!,
                      last4: result.card.last4!,
                      expMonth: 12,
                      expYear: new Date().getFullYear() + 5,
                    },
                    ...prev,
                  ]);
                  setSelectedCardId(nextCard.id);
                  setUseNewCard(false);
                  return nextCard;
                }

                return null;
              }}
            />
          </Elements>
        )}

        {allSavedCards.length > 0 && !useNewCard && !bookingSuccess && (
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/40 p-4 space-y-3">
              <h3 className="text-sm font-semibold text-foreground">
                Payment Details
              </h3>

              <div className="space-y-2">
                <label
                  className="text-xs font-medium text-foreground"
                  htmlFor="coupon-code-input"
                >
                  Coupon code
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    id="coupon-code-input"
                    value={promoCodeInput}
                    onChange={(event) =>
                      setPromoCodeInput(event.target.value.toUpperCase())
                    }
                    placeholder="Enter code"
                    disabled={isValidatingPromoCode || isBooking}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleApplyPromoCode}
                    disabled={isValidatingPromoCode || isBooking}
                  >
                    {isValidatingPromoCode ? "Applying..." : "Apply"}
                  </Button>
                </div>
                {promoError ? (
                  <p className="text-xs text-destructive">{promoError}</p>
                ) : null}
                {appliedPromoCode ? (
                  <div className="flex items-center justify-between text-xs text-foreground">
                    <span>Applied: {appliedPromoCode}</span>
                    <button
                      type="button"
                      className="text-muted-foreground underline"
                      onClick={handleRemovePromoCode}
                      disabled={isBooking}
                    >
                      Remove
                    </button>
                  </div>
                ) : null}
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total booking amount</span>
                  <span className="font-semibold text-foreground">
                    {formatUSD(totalAmount)}
                  </span>
                </div>
                {promoDiscountAmount > 0 ? (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Coupon discount</span>
                    <span className="font-semibold text-foreground">
                      -{formatUSD(promoDiscountAmount)}
                    </span>
                  </div>
                ) : null}
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Discounted total</span>
                  <span className="font-semibold text-foreground">
                    {formatUSD(discountedTotalAmount)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Amount due now</span>
                  <span className="font-semibold text-foreground">
                    {formatUSD(amountDueNow)}
                  </span>
                </div>
              </div>

              <div className="space-y-1 rounded-md bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">
                  {downpaymentPercentage > 0
                    ? `Your selected card will be charged ${downpaymentPercentage}% now as downpayment. Remaining balance can be charged later.`
                    : "No downpayment is charged now. Your card will still be saved for future charges."}
                </p>
                <p className="text-xs text-muted-foreground">
                  Cancellation & no-show policy: If you cancel within{" "}
                  {formatDurationLabel(cancellationDuration)} before your
                  appointment start time, or do not show up, up to{" "}
                  {cancellationPercent}% of the booked amount may be charged.
                </p>
              </div>
            </div>

            <Button
              onClick={handleBookAppointment}
              className="w-full"
              size="lg"
              disabled={isBooking || !selectedCardId}
            >
              {isBooking ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-background mr-2"></div>
                  Booking Appointment...
                </>
              ) : (
                "Book Appointment"
              )}
            </Button>
          </div>
        )}

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
