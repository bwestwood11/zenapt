"use client";

import React from "react";
import Header from "./header";
import { useCheckoutStore } from "./hooks/useStore";
import { STEPS } from "./steps";
import Footer from "./footer";
import { OrganizationProvider } from "./hooks/useOrganization";

type WidgetProps = {
  orgId: string;
};



const Widget = ({ orgId }: WidgetProps) => {
  return (
    <OrganizationProvider orgId={orgId}>
      <div className="h-svh w-full max-w-2xl mx-auto flex flex-col" data-org-id={orgId}>
        <Header />
        <WidgetBody />
      </div>
    </OrganizationProvider>
  );
};

const WidgetBody = () => {
  const { step } = useCheckoutStore();
  // if (!!error) return <Error />;
  const currentStep = React.useMemo(
    () => STEPS.find((v) => v.id === step),
    [step],
  );

  if (!currentStep) return null;

  return (
    <div className="overflow-y-auto flex flex-1 p-6">
      <div className="space-y-6 h-full flex w-full flex-col animate-in fade-in slide-in-from-right-4 duration-500">
        {/* {!isFirstPage ? (
          <button
            type="button"
            onClick={() => handleBack()}
            className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            {currentStep.backButtonTitle}
          </button>
        ) : null} */}
        <div className="space-y-1">
          <h3 className="text-3xl font-serif text-balance">
            {currentStep.title}
          </h3>
          <p className="text-muted-foreground text-xs text-pretty">
            {currentStep.description}
          </p>
        </div>
        <div className="flex-1 w-full overflow-y-auto [scrollbar-gutter:stable] px-2">
          {currentStep.component}
        </div>
        <Footer />
      </div>
    </div>
  );
};

export default Widget;
