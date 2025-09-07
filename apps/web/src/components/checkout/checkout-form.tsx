"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogOverlay,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Separator } from "@/components/ui/separator";
import { Check, CreditCard, MapPin, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import StripeForm from "./stripe-form";

interface SubscriptionModalProps {
  open: boolean;
}

export function SubscriptionModal({ open }: SubscriptionModalProps) {
  const [step, setStep] = useState(1);
  const [locations, setLocations] = useState(1);

  const price = useQuery(trpc.payments.priceDetails.queryOptions());
  if (price.error) {
    return <div>Error loading price details: {price.error.message}</div>;
  }
  const pricePerLocation = (price.data?.price ?? 0) / 100;
  const totalPrice = locations * pricePerLocation;

  const handleNext = () => {
    if (step < 2) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  return (
    <Dialog open={open}>
      <DialogOverlay className="backdrop-blur-2xl bg-primary/40" />
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <DialogTitle className="text-2xl font-bold text-balance">
              Elevate Your Med Spa Experience
            </DialogTitle>
          </div>

          {/* Progress indicator */}
          <div className="flex items-center gap-2">
            {[1, 2].map((i) => (
              <div key={i} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    i <= step
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {i < step ? <Check className="h-4 w-4" /> : i}
                </div>
                {i < 2 && (
                  <div
                    className={`w-12 h-0.5 mx-2 ${
                      i < step ? "bg-primary" : "bg-muted"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </DialogHeader>

        {/* Step 1: Location Selection */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h3 className="text-xl font-semibold">
                How many locations do you manage?
              </h3>
              <p className="text-muted-foreground">
                Our premium booking software scales with your business
              </p>
            </div>

            <Card className="border-2 border-primary/20 bg-card/50">
              <CardHeader className="text-center">
                <CardTitle className="flex items-center justify-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  Select Locations
                </CardTitle>
                <CardDescription>
                  $500 per location - Premium features included
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-center gap-4">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setLocations(Math.max(1, locations - 1))}
                    disabled={locations <= 1}
                  >
                    -
                  </Button>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary">
                      {locations}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {locations === 1 ? "Location" : "Locations"}
                    </div>
                  </div>
                  <Button
                    disabled={!price.data?.price}
                    variant="outline"
                    size="icon"
                    onClick={() => setLocations(locations + 1)}
                  >
                    +
                  </Button>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Locations:</span>
                    <span className="font-medium">{locations}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">
                      Price per location:
                    </span>
                    <span className="font-medium">${pricePerLocation}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>Total Monthly:</span>
                    <span className="text-primary">
                      ${totalPrice.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-accent" />
                    <span>Advanced Analytics</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-accent" />
                    <span>24/7 Support</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-accent" />
                    <span>Custom Branding</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-accent" />
                    <span>API Access</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button
              disabled={!price.data?.price}
              onClick={handleNext}
              className="w-full"
              size="lg"
            >
              Continue to Payment
            </Button>
          </div>
        )}

        {/* Step 2: Payment Form */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h3 className="text-xl font-semibold">Secure Payment</h3>
              <p className="text-muted-foreground">
                Your information is protected with enterprise-grade security
              </p>
            </div>

            {/* Order Summary */}
            <Card className="bg-muted/30">
              <CardHeader>
                <CardTitle className="text-lg">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span>
                    {locations} Location{locations > 1 ? "s" : ""}
                  </span>
                  <span>${totalPrice.toLocaleString()}/month</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span className="text-primary">
                    ${totalPrice.toLocaleString()}/month
                  </span>
                </div>
              </CardContent>
            </Card>

            {!price.data?.price && "Loading Price"}
            {price.data?.price && (
              <StripeForm
                numberOfLocations={locations}
                price={price.data?.price}
              />
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
