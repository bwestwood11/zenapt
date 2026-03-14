"use client";

import React from "react";
import { Button } from "../ui/button";
import { StepIds, useCheckoutStore } from "./hooks/useStore";
import { ErrorWidget } from "./error";
import { useCustomerSession } from "./hooks/useCustomerSession";

const Footer = () => {
  const { handleNext, step, handleBack, hasPreviousStep } = useCheckoutStore();
  const session = useCustomerSession();
  const isPreviousStepDisabled = !hasPreviousStep();
  const isPaymentStep = step === StepIds.PAYMENT;
  const isConfirmationStep = step === StepIds.CONFIRMATION;

  // Hide footer on payment and confirmation steps
  if (isPaymentStep || isConfirmationStep) {
    return null;
  }

  // Check if user is a customer (authenticated for booking purposes)
  const isAuthenticated = Boolean(session?.data?.customer);

  const handleNextStep = async () => {
    handleNext(isAuthenticated);
  };

  return (
    <div className="flex relative items-center gap-4 justify-between mt-10 pt-8 border-t border-sidebar-border">
      <ErrorWidget />

      <Button
        type="button"
        onClick={() => {
          handleBack();
        }}
        variant="ghost"
        disabled={isPreviousStepDisabled}
        className="text-muted-foreground flex-1 hover:text-foreground"
      >
        Back
      </Button>
      <Button
        type="button"
        onClick={handleNextStep}
        className="bg-primary text-primary-foreground flex-1 hover:bg-accent shadow-md hover:shadow-lg transition-all"
      >
        Next
      </Button>
    </div>
  );
};

export default Footer;
