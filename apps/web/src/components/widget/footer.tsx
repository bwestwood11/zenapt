"use client";

import React, { useState } from "react";
import { Button } from "../ui/button";
import { useCheckoutStore } from "./hooks/useStore";
import { ErrorWidget } from "./error";

const Footer = () => {
  const { handleNext, step, handleBack, hasPreviousStep } = useCheckoutStore();
  const [showError, setShowError] = useState(false);
  const formErrors = [];
  const isPreviousStepDisabled = !hasPreviousStep();
  // const hasStepError = currentStepFields.some(
  //   (field) => formErrors[field as keyof WidgetDataType]
  // );

  // useEffect(() => {
  //   let timer: NodeJS.Timeout;

  //   if (showError) {
  //     timer = setTimeout(() => {
  //       setShowError(false);
  //     }, ERROR_DISPLAY_TIME);
  //   }

  //   return () => clearTimeout(timer);
  // }, [showError]);

  const handleNextStep = async () => {
    // const isSuccess = await form.trigger(STEPS[currentPageIndex].validates);

    // if (isSuccess) {
    //   setShowError(false);
    //   handleNext();
    // } else {
    //   setShowError(true);
    // }

    handleNext();
  };

  // const isBackDisabled = !hasPreviousPage;
  // const isNextDisabled = !hasNextPage;
  // const errors = extractFormError(formErrors, STEPS[currentPageIndex]);

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
