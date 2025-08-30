"use client";

import OnboardingForm from "../../../components/onboarding/onboarding-form";
import { Sparkles } from "lucide-react";
import type React from "react";

export default function OnboardingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header Section */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-primary/10 p-3 rounded-full">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Welcome to Zenapt
          </h1>
          <p className="text-lg text-muted-foreground max-w-md mx-auto">
            The all-in-one booking management system designed specifically for
            medical spas.
          </p>
        </div>

        {/* Main Form Card */}
        <OnboardingForm />

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-muted-foreground">
            Need help? Contact our support team for personalized assistance.
          </p>
        </div>
      </div>
    </div>
  );
}
