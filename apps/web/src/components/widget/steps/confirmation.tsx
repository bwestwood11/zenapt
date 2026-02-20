"use client";

import React from "react";
import { CheckCircle2, Calendar, Clock, CreditCard, MapPin } from "lucide-react";
import { useCheckoutStore } from "../hooks/useStore";
import { Button } from "@/components/ui/button";

const ConfirmationPage = () => {
  const cart = useCheckoutStore((state) => state.cart);
  const appointmentTime = useCheckoutStore((state) => state.appointmentTime);

  // Get saved card info from session storage or state if needed
  const [savedCard] = React.useState<{
    brand?: string | null;
    last4?: string | null;
  } | null>(
    globalThis.window === undefined
      ? null
      : JSON.parse(sessionStorage.getItem("savedCard") || "null"),
  );

  return (
    <div className="max-w-2xl mx-auto">
      <div className="space-y-8">
        {/* Success Header */}
        <div className="text-center space-y-4 py-8">
          <div className="flex justify-center">
            <div className="rounded-full bg-primary/10 p-6">
              <CheckCircle2 className="h-16 w-16 text-primary" />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-foreground">
              Appointment Confirmed!
            </h2>
            <p className="text-muted-foreground text-lg">
              Your booking has been successfully confirmed
            </p>
          </div>
        </div>

        {/* Appointment Details Card */}
        <div className="rounded-xl border-2 border-border bg-card shadow-lg overflow-hidden">
          <div className="bg-primary/5 px-6 py-4 border-b border-border">
            <h3 className="text-lg font-semibold text-foreground">
              Appointment Details
            </h3>
          </div>

          <div className="p-6 space-y-6">
            {/* Date & Time */}
            {appointmentTime && (
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Date & Time
                  </p>
                  <p className="text-base font-semibold text-foreground">
                    {new Date(appointmentTime.start).toLocaleDateString(
                      "en-US",
                      {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      },
                    )}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      {new Date(appointmentTime.start).toLocaleTimeString(
                        "en-US",
                        {
                          hour: "numeric",
                          minute: "2-digit",
                        },
                      )}{" "}
                      -{" "}
                      {new Date(appointmentTime.end).toLocaleTimeString(
                        "en-US",
                        {
                          hour: "numeric",
                          minute: "2-digit",
                        },
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Services */}
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  Services Booked
                </p>
                <div className="space-y-2">
                  {cart.map((item, index) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-2 text-foreground"
                    >
                      <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                      <p className="text-base">
                        Service {index + 1}
                        {item.addons && item.addons.length > 0 && (
                          <span className="text-sm text-muted-foreground ml-2">
                            (+{item.addons.length} add-on
                            {item.addons.length === 1 ? "" : "s"})
                          </span>
                        )}
                      </p>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  {cart.length} service{cart.length === 1 ? "" : "s"} total
                </p>
              </div>
            </div>

            {/* Payment Method */}
            {savedCard?.last4 && (
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  <CreditCard className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Payment Method
                  </p>
                  <p className="text-base text-foreground font-medium">
                    {savedCard.brand
                      ? `${savedCard.brand.charAt(0).toUpperCase() + savedCard.brand.slice(1)} `
                      : "Card "}
                    ••••{savedCard.last4}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Confirmation Message */}
        <div className="rounded-lg bg-muted/50 border border-border p-6 text-center space-y-2">
          <p className="text-sm text-foreground font-medium">
            📧 Confirmation email sent
          </p>
          <p className="text-xs text-muted-foreground">
            We've sent you a confirmation email with all the details of your
            appointment. Please check your inbox.
          </p>
        </div>

        {/* Action Button */}
        <div className="flex justify-center pt-4">
          <Button
            onClick={() => {
              // Close widget or navigate to home
              globalThis.window.location.reload();
            }}
            size="lg"
            className="px-8"
          >
            Done
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationPage;
