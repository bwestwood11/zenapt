"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CreditCard } from "lucide-react";
import { toast } from "sonner";
import getStripe from "@/lib/stripe/config";

type ChargeBalanceModalProps = Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentId: string;
}>;

type ChargeSummaryData = {
  locationId: string;
  customerName: string;
  totalAmount: number;
  discountAmount: number;
  discountedTotalAmount: number;
  alreadyChargedAmount: number;
  remainingAmount: number;
  promoCode: string | null;
  promoDiscountPercentage: number | null;
  selectedPaymentMethodId: string | null;
  savedPaymentMethods: Array<{
    id: string;
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  }>;
  hasPaymentMethod: boolean;
  paymentMethodLast4: string | null;
  tipEnabled: boolean;
  tipPresetPercentages: number[];
  tipEmployeeName: string | null;
  hasMultipleTipEmployees: boolean;
};

type ChargeStep = "card" | "tip" | "review";
type TipChoice = "none" | "custom" | `preset:${number}`;
type CardChoice = "appointment" | "other" | "new";

const SetupIntentForm = ({
  onFinalize,
}: {
  onFinalize: (setupIntentId: string) => Promise<void>;
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [cardholderName, setCardholderName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
      setErrorMessage(error.message || "Payment setup failed. Try again.");
      setIsSubmitting(false);
      return;
    }

    if (
      (setupIntent?.status === "succeeded" ||
        setupIntent?.status === "processing") &&
      setupIntent.id
    ) {
      try {
        await onFinalize(setupIntent.id);
      } catch (finalizeError) {
        setErrorMessage(
          finalizeError instanceof Error
            ? finalizeError.message
            : "Failed to save card. Please try again.",
        );
      }
    }

    setIsSubmitting(false);
  };

  return (
    <form className="space-y-3" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="new-card-holder-name">Cardholder name</Label>
        <Input
          id="new-card-holder-name"
          type="text"
          placeholder="John Doe"
          value={cardholderName}
          onChange={(event) => setCardholderName(event.target.value)}
          autoComplete="cc-name"
        />
      </div>

      <PaymentElement />

      {errorMessage ? (
        <p className="text-sm text-destructive">{errorMessage}</p>
      ) : null}

      <Button type="submit" disabled={isSubmitting || !stripe || !elements}>
        {isSubmitting ? "Saving card..." : "Save card"}
      </Button>
    </form>
  );
};

const STEP_META: Record<ChargeStep, { index: string; description: string }> = {
  card: { index: "1", description: "Select card" },
  tip: { index: "2", description: "Choose tip" },
  review: { index: "3", description: "Review final bill" },
};

const formatUSD = (amountInCents: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amountInCents / 100);
};

const parseDollarsToCents = (value: string) => {
  if (!value.trim()) {
    return 0;
  }

  const normalized = Number(value);
  if (!Number.isFinite(normalized) || normalized < 0) {
    return null;
  }

  return Math.round(normalized * 100);
};

const getCardLabel = (card: ChargeSummaryData["savedPaymentMethods"][number]) => {
  const brand = card.brand.charAt(0).toUpperCase() + card.brand.slice(1);
  return `${brand} •••• ${card.last4} (exp ${String(card.expMonth).padStart(2, "0")}/${card.expYear})`;
};

const renderLoadingState = (isLoading: boolean) => {
  if (!isLoading) {
    return null;
  }

  return (
    <div className="space-y-5 py-2">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <div className="size-4 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
        Loading payment details...
      </div>

      <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3 animate-pulse">
        <div className="h-4 w-40 rounded bg-muted-foreground/20" />
        <div className="h-3 w-full rounded bg-muted-foreground/20" />
        <div className="h-3 w-5/6 rounded bg-muted-foreground/20" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 animate-pulse">
        <div className="h-20 rounded-lg border border-border bg-muted/30" />
        <div className="h-20 rounded-lg border border-border bg-muted/30" />
      </div>

      <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3 animate-pulse">
        <div className="h-3 w-48 rounded bg-muted-foreground/20" />
        <div className="h-10 w-full rounded bg-muted-foreground/20" />
        <div className="h-10 w-full rounded bg-muted-foreground/20" />
      </div>
    </div>
  );
};

const renderNewCardPanel = ({
  addCardClientSecret,
  customerSessionClientSecret,
  addCardStripeAccountId,
  isLoadingAddCard,
  addCardError,
  onFinalizeNewCard,
  recentlyAddedCardLabel,
}: {
  addCardClientSecret: string | null;
  customerSessionClientSecret: string | null;
  addCardStripeAccountId: string | null;
  isLoadingAddCard: boolean;
  addCardError: string | null;
  onFinalizeNewCard: (setupIntentId: string) => Promise<void>;
  recentlyAddedCardLabel: string | null;
}) => {
  return (
    <div className="space-y-3 rounded-md border border-border p-3">
      <p className="text-sm text-muted-foreground">
        Add a new card for this customer and use it for this charge.
      </p>

      {isLoadingAddCard ? (
        <div className="rounded-md border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
          Preparing secure card form...
        </div>
      ) : null}

      {addCardError ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {addCardError}
        </div>
      ) : null}

      {recentlyAddedCardLabel ? (
        <div className="rounded-md border border-primary/40 bg-primary/5 p-3 text-sm">
          New card saved: <span className="font-medium">{recentlyAddedCardLabel}</span>
        </div>
      ) : null}

      {addCardClientSecret ? (
        <Elements
          stripe={getStripe(addCardStripeAccountId)}
          options={{
            clientSecret: addCardClientSecret,
            customerSessionClientSecret: customerSessionClientSecret ?? undefined,
            appearance: {
              theme: "stripe",
            },
          }}
        >
          <SetupIntentForm onFinalize={onFinalizeNewCard} />
        </Elements>
      ) : null}
    </div>
  );
};

const renderCardStep = ({
  isLoading,
  data,
  cardChoice,
  selectedPaymentMethodId,
  onCardChoiceChange,
  onSelectPaymentMethod,
  addCardClientSecret,
  customerSessionClientSecret,
  addCardStripeAccountId,
  isLoadingAddCard,
  addCardError,
  onFinalizeNewCard,
  recentlyAddedCardLabel,
}: {
  isLoading: boolean;
  data: ChargeSummaryData | undefined;
  cardChoice: CardChoice;
  selectedPaymentMethodId: string | null;
  onCardChoiceChange: (value: CardChoice) => void;
  onSelectPaymentMethod: (paymentMethodId: string | null) => void;
  addCardClientSecret: string | null;
  customerSessionClientSecret: string | null;
  addCardStripeAccountId: string | null;
  isLoadingAddCard: boolean;
  addCardError: string | null;
  onFinalizeNewCard: (setupIntentId: string) => Promise<void>;
  recentlyAddedCardLabel: string | null;
}) => {
  if (isLoading || !data) {
    return null;
  }

  const appointmentCard = data.savedPaymentMethods.find(
    (card) => card.id === data.selectedPaymentMethodId,
  );
  const otherCards = data.savedPaymentMethods.filter(
    (card) => card.id !== data.selectedPaymentMethodId,
  );

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
        <p className="font-medium">Choose payment card</p>
        <p className="text-sm text-muted-foreground">
          Select the card to be charged for the remaining balance and tip.
        </p>
      </div>

      <div className="space-y-3">
        {appointmentCard ? (
          <button
            type="button"
            onClick={() => {
              onCardChoiceChange("appointment");
              onSelectPaymentMethod(appointmentCard.id);
            }}
            className={`w-full rounded-md border p-3 text-left text-sm ${
              cardChoice === "appointment" ? "border-primary bg-primary/5" : "border-border"
            }`}
          >
            <p className="font-medium">Use appointment card</p>
            <p className="text-muted-foreground">{getCardLabel(appointmentCard)}</p>
          </button>
        ) : null}

        <button
          type="button"
          onClick={() => {
            onCardChoiceChange("other");
            if (!selectedPaymentMethodId && otherCards[0]) {
              onSelectPaymentMethod(otherCards[0].id);
            }
          }}
          className={`w-full rounded-md border p-3 text-left text-sm ${
            cardChoice === "other" ? "border-primary bg-primary/5" : "border-border"
          }`}
        >
          <p className="font-medium">Use other card</p>
          <p className="text-muted-foreground">Pick another saved card from this customer</p>
        </button>

        <button
          type="button"
          onClick={() => {
            onCardChoiceChange("new");
            onSelectPaymentMethod(null);
          }}
          className={`w-full rounded-md border p-3 text-left text-sm ${
            cardChoice === "new" ? "border-primary bg-primary/5" : "border-border"
          }`}
        >
          <p className="font-medium">Add new card</p>
          <p className="text-muted-foreground">Add a new card for this customer</p>
        </button>

        {cardChoice === "other" ? (
          <div className="space-y-2 rounded-md border border-border p-3">
            {otherCards.length > 0 ? (
              otherCards.map((card) => (
                <button
                  type="button"
                  key={card.id}
                  onClick={() => onSelectPaymentMethod(card.id)}
                  className={`w-full rounded-md border p-3 text-left text-sm ${
                    selectedPaymentMethodId === card.id
                      ? "border-primary bg-primary/5"
                      : "border-border"
                  }`}
                >
                  {getCardLabel(card)}
                </button>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No additional saved cards found.
              </p>
            )}
          </div>
        ) : null}

        {cardChoice === "new"
          ? renderNewCardPanel({
              addCardClientSecret,
              customerSessionClientSecret,
              addCardStripeAccountId,
              isLoadingAddCard,
              addCardError,
              onFinalizeNewCard,
              recentlyAddedCardLabel,
            })
          : null}

        {data.savedPaymentMethods.length === 0 ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            No saved cards found for this customer.
          </div>
        ) : null}
      </div>
    </div>
  );
};

const renderTipStep = ({
  isLoading,
  data,
  canAddTip,
  tipChoice,
  tipInput,
  tipAmountCents,
  onSelectNone,
  onSelectCustom,
  onSelectPreset,
  onTipChange,
}: {
  isLoading: boolean;
  data: ChargeSummaryData | undefined;
  canAddTip: boolean;
  tipChoice: TipChoice;
  tipInput: string;
  tipAmountCents: number | null;
  onSelectNone: () => void;
  onSelectCustom: () => void;
  onSelectPreset: (preset: number) => void;
  onTipChange: (value: string) => void;
}) => {
  if (isLoading || !data) {
    return null;
  }

  const tipGridOptions = [
    {
      key: "none" as const,
      label: "None",
      amount: 0,
      onClick: onSelectNone,
    },
    ...((data.tipEnabled ? data.tipPresetPercentages : []) ?? []).map((preset) => ({
      key: `preset:${preset}` as const,
      label: `${preset}%`,
      amount: Math.round((data.totalAmount * preset) / 100),
      onClick: () => onSelectPreset(preset),
    })),
    {
      key: "custom" as const,
      label: "Custom",
      amount: null,
      onClick: onSelectCustom,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
        <p className="font-medium">Choose tip</p>
        <p className="text-sm text-muted-foreground">
          Tip presets are calculated from total appointment amount ({formatUSD(data.totalAmount)}).
        </p>
      </div>

      {data.tipEmployeeName ? (
        <div className="rounded-md border border-border p-3 text-sm">
          <span className="text-muted-foreground">Tip will be attributed to </span>
          <span className="font-medium">{data.tipEmployeeName}</span>
        </div>
      ) : null}

      {data.hasMultipleTipEmployees ? (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700">
          This appointment includes multiple employees. Tip attribution is disabled here.
        </div>
      ) : null}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {tipGridOptions.map((option) => {
          const isActive = tipChoice === option.key;
          return (
            <button
              key={option.key}
              type="button"
              disabled={!canAddTip && option.key !== "none"}
              onClick={option.onClick}
              className={`rounded-md border p-3 text-left text-sm ${
                isActive ? "border-primary bg-primary/5" : "border-border"
              }`}
            >
              <p className="font-medium">{option.label}</p>
              <p className="text-muted-foreground">
                {option.amount === null ? "Enter amount" : formatUSD(option.amount)}
              </p>
            </button>
          );
        })}
      </div>

      {tipChoice === "custom" ? (
        <div className="space-y-2">
          <Label htmlFor="tip-input">Custom tip amount</Label>
          <Input
            id="tip-input"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={tipInput}
            onChange={(event) => onTipChange(event.target.value)}
            disabled={!canAddTip}
          />
          {tipAmountCents === null ? (
            <p className="text-sm text-destructive">Enter a valid tip amount.</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

const renderReviewStep = ({
  isLoading,
  data,
  selectedPaymentMethodId,
  tipAmount,
  totalChargeAmount,
  selectedCardFallbackLabel,
  promoCodeInput,
  onPromoCodeChange,
  onApplyPromoCode,
  onClearAppliedPromoCode,
  validatedPromoCode,
  promoApplyError,
  isValidatingPromoCode,
  displayDiscountAmount,
  displayDiscountedTotal,
  displayRemainingAmount,
}: {
  isLoading: boolean;
  data: ChargeSummaryData | undefined;
  selectedPaymentMethodId: string | null;
  tipAmount: number;
  totalChargeAmount: number;
  selectedCardFallbackLabel: string | null;
  promoCodeInput: string;
  onPromoCodeChange: (value: string) => void;
  onApplyPromoCode: () => void;
  onClearAppliedPromoCode: () => void;
  validatedPromoCode: {
    code: string;
    discountPercentage: number;
    discountAmount: number;
    discountedTotal: number;
  } | null;
  promoApplyError: string | null;
  isValidatingPromoCode: boolean;
  displayDiscountAmount: number;
  displayDiscountedTotal: number;
  displayRemainingAmount: number;
}) => {
  if (isLoading || !data) {
    return null;
  }

  const hasAppliedCoupon =
    Boolean(data.promoCode) || data.discountAmount > 0 || Boolean(validatedPromoCode);
  let appliedDiscountDetails = `Discount applied: ${formatUSD(displayDiscountAmount)}`;

  if (typeof data.promoDiscountPercentage === "number") {
    appliedDiscountDetails = `Discount: ${data.promoDiscountPercentage}% (${formatUSD(data.discountAmount)})`;
  } else if (typeof validatedPromoCode?.discountPercentage === "number") {
    appliedDiscountDetails = `Discount: ${validatedPromoCode.discountPercentage}% (${formatUSD(validatedPromoCode.discountAmount)})`;
  }

  const selectedCard = data.savedPaymentMethods.find(
    (card) => card.id === selectedPaymentMethodId,
  );

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
        <p className="font-medium">Review charge</p>
        <p className="text-sm text-muted-foreground">
          Confirm the final bill before charging the card.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Total appointment</span>
          <span>{formatUSD(data.totalAmount)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Coupon discount</span>
          <span>-{formatUSD(displayDiscountAmount)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Discounted total</span>
          <span>{formatUSD(displayDiscountedTotal)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Already paid</span>
          <span>{formatUSD(data.alreadyChargedAmount)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Remaining</span>
          <span>{formatUSD(displayRemainingAmount)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Tip</span>
          <span>{formatUSD(tipAmount)}</span>
        </div>
        <Separator />
        <div className="flex items-center justify-between font-semibold">
          <span>Final charge</span>
          <Badge variant="secondary">{formatUSD(totalChargeAmount)}</Badge>
        </div>
      </div>

      <div className="rounded-md border border-border p-3 text-sm">
        <span className="text-muted-foreground">Card: </span>
        <span className="font-medium">
          {selectedCard
            ? getCardLabel(selectedCard)
            : selectedCardFallbackLabel ?? "No card selected"}
        </span>
      </div>

      {hasAppliedCoupon ? (
        <div className="space-y-2 rounded-md border border-border p-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Applied coupon</span>
            <Badge variant="secondary">
              {data.promoCode ?? validatedPromoCode?.code ?? "Applied"}
            </Badge>
          </div>
          <p className="text-muted-foreground">{appliedDiscountDetails}</p>
        </div>
      ) : (
        <div className="space-y-2 rounded-md border border-border p-3">
          <Label htmlFor="charge-promo-code">Coupon code</Label>
          <div className="flex items-center gap-2">
            <Input
              id="charge-promo-code"
              value={promoCodeInput}
              onChange={(event) => onPromoCodeChange(event.target.value.toUpperCase())}
              placeholder="Enter code"
            />
            <Button
              type="button"
              variant="outline"
              onClick={onApplyPromoCode}
              disabled={isValidatingPromoCode}
            >
              {isValidatingPromoCode ? "Applying..." : "Apply"}
            </Button>
          </div>
          {validatedPromoCode ? (
            <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 p-2 text-xs">
              <span>
                Applied: {validatedPromoCode.code} ({validatedPromoCode.discountPercentage}% off)
              </span>
              <button
                type="button"
                className="text-muted-foreground underline"
                onClick={onClearAppliedPromoCode}
              >
                Clear
              </button>
            </div>
          ) : null}
          {promoApplyError ? (
            <p className="text-xs text-destructive">{promoApplyError}</p>
          ) : null}
          <p className="text-xs text-muted-foreground">
            Click apply to include this coupon in the charge.
          </p>
        </div>
      )}
    </div>
  );
};

const renderActiveStep = ({
  step,
  isLoading,
  data,
  cardChoice,
  selectedPaymentMethodId,
  onCardChoiceChange,
  onSelectPaymentMethod,
  tipChoice,
  canAddTip,
  tipInput,
  tipAmountCents,
  onSelectNone,
  onSelectCustom,
  onSelectPreset,
  onTipChange,
  effectiveTipAmount,
  totalChargeAmount,
  selectedCardFallbackLabel,
  addCardClientSecret,
  customerSessionClientSecret,
  addCardStripeAccountId,
  isLoadingAddCard,
  addCardError,
  onFinalizeNewCard,
  recentlyAddedCardLabel,
  promoCodeInput,
  onPromoCodeChange,
  onApplyPromoCode,
  onClearAppliedPromoCode,
  validatedPromoCode,
  promoApplyError,
  isValidatingPromoCode,
  displayDiscountAmount,
  displayDiscountedTotal,
  displayRemainingAmount,
}: {
  step: ChargeStep;
  isLoading: boolean;
  data: ChargeSummaryData | undefined;
  cardChoice: CardChoice;
  selectedPaymentMethodId: string | null;
  onCardChoiceChange: (value: CardChoice) => void;
  onSelectPaymentMethod: (paymentMethodId: string | null) => void;
  tipChoice: TipChoice;
  canAddTip: boolean;
  tipInput: string;
  tipAmountCents: number | null;
  onSelectNone: () => void;
  onSelectCustom: () => void;
  onSelectPreset: (preset: number) => void;
  onTipChange: (value: string) => void;
  effectiveTipAmount: number;
  totalChargeAmount: number;
  selectedCardFallbackLabel: string | null;
  addCardClientSecret: string | null;
  customerSessionClientSecret: string | null;
  addCardStripeAccountId: string | null;
  isLoadingAddCard: boolean;
  addCardError: string | null;
  onFinalizeNewCard: (setupIntentId: string) => Promise<void>;
  recentlyAddedCardLabel: string | null;
  promoCodeInput: string;
  onPromoCodeChange: (value: string) => void;
  onApplyPromoCode: () => void;
  onClearAppliedPromoCode: () => void;
  validatedPromoCode: {
    code: string;
    discountPercentage: number;
    discountAmount: number;
    discountedTotal: number;
  } | null;
  promoApplyError: string | null;
  isValidatingPromoCode: boolean;
  displayDiscountAmount: number;
  displayDiscountedTotal: number;
  displayRemainingAmount: number;
}) => {
  if (step === "card") {
    return renderCardStep({
      isLoading,
      data,
      cardChoice,
      selectedPaymentMethodId,
      onCardChoiceChange,
      onSelectPaymentMethod,
      addCardClientSecret,
      customerSessionClientSecret,
      addCardStripeAccountId,
      isLoadingAddCard,
      addCardError,
      onFinalizeNewCard,
      recentlyAddedCardLabel,
    });
  }

  if (step === "tip") {
    return renderTipStep({
      isLoading,
      data,
      tipChoice,
      canAddTip,
      tipInput,
      tipAmountCents,
      onSelectNone,
      onSelectCustom,
      onSelectPreset,
      onTipChange,
    });
  }

  return renderReviewStep({
    isLoading,
    data,
    selectedPaymentMethodId,
    tipAmount: effectiveTipAmount,
    totalChargeAmount,
    selectedCardFallbackLabel,
    promoCodeInput,
    onPromoCodeChange,
    onApplyPromoCode,
    onClearAppliedPromoCode,
    validatedPromoCode,
    promoApplyError,
    isValidatingPromoCode,
    displayDiscountAmount,
    displayDiscountedTotal,
    displayRemainingAmount,
  });
};

const renderActiveFooter = ({
  step,
  onClose,
  onBackToCard,
  onBackToTip,
  onContinueFromCard,
  onContinueFromTip,
  onCharge,
  canContinueFromCard,
  canContinueFromTip,
  canSubmit,
  isPending,
  totalChargeAmount,
}: {
  step: ChargeStep;
  onClose: () => void;
  onBackToCard: () => void;
  onBackToTip: () => void;
  onContinueFromCard: () => void;
  onContinueFromTip: () => void;
  onCharge: () => void;
  canContinueFromCard: boolean;
  canContinueFromTip: boolean;
  canSubmit: boolean;
  isPending: boolean;
  totalChargeAmount: number;
}) => {
  if (step === "card") {
    return (
      <>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="button" disabled={!canContinueFromCard} onClick={onContinueFromCard}>
          Continue
        </Button>
      </>
    );
  }

  if (step === "tip") {
    return (
      <>
        <Button type="button" variant="outline" onClick={onBackToCard}>
          Back
        </Button>
        <Button type="button" disabled={!canContinueFromTip} onClick={onContinueFromTip}>
          Continue
        </Button>
      </>
    );
  }

  return (
    <>
      <Button type="button" variant="outline" onClick={onBackToTip}>
        Back
      </Button>
      <Button type="button" disabled={!canSubmit} onClick={onCharge}>
        {isPending ? "Charging..." : `Charge ${formatUSD(totalChargeAmount)}`}
      </Button>
    </>
  );
};

export function ChargeBalanceModal({
  open,
  onOpenChange,
  appointmentId,
}: ChargeBalanceModalProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<ChargeStep>("card");
  const [tipChoice, setTipChoice] = useState<TipChoice>("none");
  const [tipInput, setTipInput] = useState("");
  const [cardChoice, setCardChoice] = useState<CardChoice>("appointment");
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<
    string | null
  >(null);
  const [addCardClientSecret, setAddCardClientSecret] = useState<string | null>(
    null,
  );
  const [customerSessionClientSecret, setCustomerSessionClientSecret] =
    useState<string | null>(null);
  const [addCardStripeAccountId, setAddCardStripeAccountId] = useState<
    string | null
  >(null);
  const [addCardError, setAddCardError] = useState<string | null>(null);
  const [promoCodeInput, setPromoCodeInput] = useState("");
  const [validatedPromoCode, setValidatedPromoCode] = useState<{
    code: string;
    discountPercentage: number;
    discountAmount: number;
    discountedTotal: number;
  } | null>(null);
  const [promoApplyError, setPromoApplyError] = useState<string | null>(null);
  const [recentlyAddedCard, setRecentlyAddedCard] = useState<
    | {
        id: string;
        brand: string;
        last4: string;
        expMonth: number | null;
        expYear: number | null;
      }
    | null
  >(null);

  const { data, isLoading } = useQuery({
    ...trpc.appointment.getAppointmentChargeSummary.queryOptions({
      appointmentId,
    }),
    enabled: open,
  });

  const { mutate, isPending } = useMutation(
    trpc.appointment.chargeAppointmentRemainingBalance.mutationOptions({
      onSuccess: (result) => {
        toast.success(
          `Charged ${formatUSD(result.chargedAmount)} for ${result.customerName}`
        );
        queryClient.invalidateQueries({
          queryKey: trpc.appointment.getAppointmentChargeSummary.queryKey({
            appointmentId,
          }),
        });
        queryClient.invalidateQueries({
          queryKey: trpc.appointment.fetchAppointments.queryKey(),
        });
        onOpenChange(false);
      },
      onError: (error) => {
        toast.error(error.message || "Unable to process charge");
      },
    })
  );

  const { mutateAsync: createCardSetupIntent, isPending: isLoadingAddCard } =
    useMutation(
      trpc.appointment.createAppointmentCardSetupIntent.mutationOptions(),
    );

  const { mutateAsync: finalizeCardSetupIntent, isPending: isFinalizingNewCard } =
    useMutation(
      trpc.appointment.finalizeAppointmentCardSetupIntent.mutationOptions(),
    );

  const { mutateAsync: validatePromoCode, isPending: isValidatingPromoCode } =
    useMutation(trpc.public.validatePromoCode.mutationOptions());

  const tipAmountCents = useMemo(() => parseDollarsToCents(tipInput), [tipInput]);
  const canAddTip = Boolean(data && !data.hasMultipleTipEmployees);
  const effectiveTipAmount =
    canAddTip && typeof tipAmountCents === "number" && tipAmountCents > 0
      ? tipAmountCents
      : 0;

  const displayDiscountAmount = validatedPromoCode?.discountAmount ?? data?.discountAmount ?? 0;
  const displayDiscountedTotal =
    validatedPromoCode?.discountedTotal ?? data?.discountedTotalAmount ?? 0;
  const displayRemainingAmount = Math.max(
    0,
    displayDiscountedTotal - (data?.alreadyChargedAmount ?? 0),
  );
  const totalChargeAmount = displayRemainingAmount + effectiveTipAmount;

  useEffect(() => {
    if (!open || !data) {
      return;
    }

    const initialCardId =
      data.selectedPaymentMethodId ?? data.savedPaymentMethods[0]?.id ?? null;

    setStep("card");
    setTipChoice("none");
    setTipInput("");
    setCardChoice(data.selectedPaymentMethodId ? "appointment" : "other");
    setSelectedPaymentMethodId(initialCardId);
    setAddCardClientSecret(null);
    setCustomerSessionClientSecret(null);
    setAddCardStripeAccountId(null);
    setAddCardError(null);
    setRecentlyAddedCard(null);
    setPromoCodeInput(data.promoCode ?? "");
    setValidatedPromoCode(null);
    setPromoApplyError(null);
  }, [open, data]);

  useEffect(() => {
    let isMounted = true;

    const loadAddCardSetupIntent = async () => {
      try {
        setAddCardError(null);
        const result = await createCardSetupIntent({ appointmentId });

        if (!isMounted) {
          return;
        }

        setAddCardClientSecret(result.clientSecret ?? null);
        setCustomerSessionClientSecret(
          result.customerSessionClientSecret ?? null,
        );
        setAddCardStripeAccountId(result.stripeAccountId ?? null);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setAddCardError(
          error instanceof Error
            ? error.message
            : "Unable to prepare add card form.",
        );
      }
    };

    if (
      open &&
      cardChoice === "new" &&
      !addCardClientSecret
    ) {
      void loadAddCardSetupIntent();
    }

    if (!open || cardChoice !== "new") {
      setAddCardError(null);
    }

    return () => {
      isMounted = false;
    };
  }, [
    open,
    cardChoice,
    addCardClientSecret,
    createCardSetupIntent,
    appointmentId,
  ]);

  const canSubmit =
    !!data &&
    !!selectedPaymentMethodId &&
    tipAmountCents !== null &&
    totalChargeAmount > 0 &&
    !isPending;

  const canContinueFromCard = !!data && !!selectedPaymentMethodId;
  const canContinueFromTip =
    !!data && tipAmountCents !== null && totalChargeAmount > 0;
  const stepMeta = STEP_META[step];

  const selectedCardFallbackLabel =
    recentlyAddedCard?.id === selectedPaymentMethodId
      ? getCardLabel({
          id: recentlyAddedCard.id,
          brand: recentlyAddedCard.brand,
          last4: recentlyAddedCard.last4,
          expMonth: recentlyAddedCard.expMonth ?? 0,
          expYear: recentlyAddedCard.expYear ?? 0,
        })
      : null;

  const recentlyAddedCardLabel = recentlyAddedCard
    ? getCardLabel({
        id: recentlyAddedCard.id,
        brand: recentlyAddedCard.brand,
        last4: recentlyAddedCard.last4,
        expMonth: recentlyAddedCard.expMonth ?? 0,
        expYear: recentlyAddedCard.expYear ?? 0,
      })
    : null;

  const handleCharge = () => {
    if (tipAmountCents === null) {
      toast.error("Enter a valid tip amount");
      return;
    }

    mutate({
      appointmentId,
      tipAmount: canAddTip ? Math.max(0, tipAmountCents) : 0,
      paymentMethodId: selectedPaymentMethodId ?? undefined,
      promoCode:
        !data?.promoCode && validatedPromoCode?.code
          ? validatedPromoCode.code
          : undefined,
    });
  };

  const handleApplyPromoCode = async () => {
    const normalizedCode = promoCodeInput.trim().toUpperCase();

    if (!normalizedCode) {
      setPromoApplyError("Enter a coupon code to apply.");
      setValidatedPromoCode(null);
      return;
    }

    if (!data?.locationId) {
      setPromoApplyError("Location details are unavailable.");
      return;
    }

    setPromoApplyError(null);

    try {
      const result = await validatePromoCode({
        locationId: data.locationId,
        code: normalizedCode,
        totalAmount: data.totalAmount,
      });

      setValidatedPromoCode({
        code: result.code,
        discountPercentage: result.discountPercentage,
        discountAmount: result.discountAmount,
        discountedTotal: result.discountedTotal,
      });
      setPromoApplyError(null);
      toast.success(`Coupon ${result.code} applied.`);
    } catch (error) {
      setValidatedPromoCode(null);
      setPromoApplyError(
        error instanceof Error ? error.message : "Unable to validate coupon.",
      );
    }
  };

  const handleClearAppliedPromoCode = () => {
    setValidatedPromoCode(null);
    setPromoApplyError(null);
  };

  const handleApplyPromoCodeClick = () => {
    void handleApplyPromoCode();
  };

  const handleFinalizeNewCard = async (setupIntentId: string) => {
    const result = await finalizeCardSetupIntent({
      appointmentId,
      setupIntentId,
    });

    if (!result.card?.id || !result.card.last4 || !result.card.brand) {
      throw new Error("Unable to save card. Please try again.");
    }

    setSelectedPaymentMethodId(result.card.id);
    setRecentlyAddedCard({
      id: result.card.id,
      brand: result.card.brand,
      last4: result.card.last4,
      expMonth: result.card.expMonth,
      expYear: result.card.expYear,
    });

    await queryClient.invalidateQueries({
      queryKey: trpc.appointment.getAppointmentChargeSummary.queryKey({
        appointmentId,
      }),
    });

    toast.success("Card saved and selected for this charge.");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-none sm:max-w-none w-screen h-screen p-0 gap-0 border-0 rounded-none">
        <div className="h-full w-full flex flex-col bg-background">
          <DialogHeader className="px-6 py-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
            <div className="flex items-center justify-between gap-3">
              <div>
                <DialogTitle className="flex items-center gap-2 text-lg">
                  <CreditCard className="size-5" />
                  Charge Remaining Balance
                </DialogTitle>
                <DialogDescription className="mt-1">
                  {stepMeta.description}
                </DialogDescription>
              </div>
              <Badge variant="secondary">Step {stepMeta.index} / 3</Badge>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-4xl px-6 py-6">
              {renderLoadingState(isLoading)}
              {renderActiveStep({
                step,
                isLoading,
                data: data as ChargeSummaryData | undefined,
                cardChoice,
                selectedPaymentMethodId,
                onCardChoiceChange: setCardChoice,
                onSelectPaymentMethod: setSelectedPaymentMethodId,
                tipChoice,
                canAddTip,
                tipInput,
                tipAmountCents,
                onSelectNone: () => {
                  setTipChoice("none");
                  setTipInput("");
                },
                onSelectCustom: () => {
                  setTipChoice("custom");
                },
                onSelectPreset: (preset) => {
                  setTipChoice(`preset:${preset}`);
                  setTipInput(((data?.totalAmount ?? 0) * preset / 100 / 100).toFixed(2));
                },
                onTipChange: setTipInput,
                effectiveTipAmount,
                totalChargeAmount,
                selectedCardFallbackLabel,
                addCardClientSecret,
                customerSessionClientSecret,
                addCardStripeAccountId,
                isLoadingAddCard: isLoadingAddCard || isFinalizingNewCard,
                addCardError,
                onFinalizeNewCard: handleFinalizeNewCard,
                recentlyAddedCardLabel,
                promoCodeInput,
                onPromoCodeChange: setPromoCodeInput,
                onApplyPromoCode: handleApplyPromoCodeClick,
                onClearAppliedPromoCode: handleClearAppliedPromoCode,
                validatedPromoCode,
                promoApplyError,
                isValidatingPromoCode,
                displayDiscountAmount,
                displayDiscountedTotal,
                displayRemainingAmount,
              })}
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
            <div className="mx-auto w-full  flex items-center justify-end gap-2">
              {renderActiveFooter({
                step,
                onClose: () => onOpenChange(false),
                onBackToCard: () => setStep("card"),
                onBackToTip: () => setStep("tip"),
                onContinueFromCard: () => setStep("tip"),
                onContinueFromTip: () => setStep("review"),
                onCharge: handleCharge,
                canContinueFromCard,
                canContinueFromTip,
                canSubmit,
                isPending,
                totalChargeAmount,
              })}
            </div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
