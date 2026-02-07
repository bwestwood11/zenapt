"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard, Lock } from "lucide-react";
import { ProtectedStep } from "./protected-step";

const PaymentPage = () => {
  const [cardNumber, setCardNumber] = React.useState("");
  const [expiryDate, setExpiryDate] = React.useState("");
  const [cvv, setCvv] = React.useState("");
  const [cardName, setCardName] = React.useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle payment submission
    console.log("Payment submitted");
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cardName">Cardholder Name</Label>
            <Input
              id="cardName"
              type="text"
              placeholder="John Doe"
              value={cardName}
              onChange={(e) => setCardName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cardNumber">Card Number</Label>
            <div className="relative">
              <Input
                id="cardNumber"
                type="text"
                placeholder="1234 5678 9012 3456"
                value={cardNumber}
                onChange={(e) => {
                  const value = e.target.value.replace(/\s/g, "");
                  if (value.length <= 16 && /^\d*$/.test(value)) {
                    const formatted =
                      value.match(/.{1,4}/g)?.join(" ") || value;
                    setCardNumber(formatted);
                  }
                }}
                required
                maxLength={19}
              />
              <CreditCard className="absolute right-3 top-3 h-5 w-5 text-muted-foreground" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="expiryDate">Expiry Date</Label>
              <Input
                id="expiryDate"
                type="text"
                placeholder="MM/YY"
                value={expiryDate}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "");
                  if (value.length <= 4) {
                    const formatted =
                      value.length >= 2
                        ? `${value.slice(0, 2)}/${value.slice(2)}`
                        : value;
                    setExpiryDate(formatted);
                  }
                }}
                required
                maxLength={5}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cvv">CVV</Label>
              <Input
                id="cvv"
                type="text"
                placeholder="123"
                value={cvv}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "");
                  if (value.length <= 4) {
                    setCvv(value);
                  }
                }}
                required
                maxLength={4}
              />
            </div>
          </div>

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

          <Button type="submit" className="w-full" size="lg">
            Complete Booking
          </Button>
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
