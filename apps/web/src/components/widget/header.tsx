"use client";

import { User } from "lucide-react";
import React from "react";
import { STEPS } from "./steps";
import { Button } from "../ui/button";
import { useCheckoutStore } from "./hooks/useStore";

const Header = () => {
  const {step} = useCheckoutStore()
  const currentPageIndex = STEPS.findIndex((v) => v.id === step);
 const currentStep = STEPS.find((v) => v.id === step);
  const totalSteps = STEPS.length;
  return (
    <div className="w-full bg-sidebar border-r border-sidebar-border p-8 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-primary rounded-md shadow-sm" />
          <span className="font-semibold text-lg text-foreground">
            Serenity Medspa
          </span>
        </div>
        <Button variant="ghost" size="icon" className="h-9 w-9 bg-primary/30 rounded-full" >
          <User className="h-5 w-5" />
        </Button>
      </div>

      {/* Progress */}
      <div className="mb-10">
        <div className="text-sm font-semibold text-foreground mb-3 tracking-wide">
          Step {currentPageIndex + 1} of {totalSteps}: {currentStep?.title}
        </div>
        <div className="h-1.5 w-full bg-sidebar-border rounded-full overflow-hidden">
          <div
            style={{
              width: ((currentPageIndex + 1) / totalSteps) * 100 + "%",
            }}
            className="h-full bg-primary rounded-full shadow-sm"
          />
        </div>
      </div>
    </div>
  );
};

export default Header;
