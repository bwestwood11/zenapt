"use client";

import { trpc } from "@/utils/trpc";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle,
  Download,
  CreditCard,
  MapPin,
  Mail,
  Phone,
  Building2,
  MessageSquare,
  Users,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import ClockLoader from "../ui/clock-loader";
const orderData = {
  orderNumber: "MEDSPA-2024-001234",
  date: new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }),
  billingDetails: {
    name: "Dr. Sarah Johnson",
    businessName: "Radiance Med Spa",
    email: "sarah@radiancemedspa.com",
    phone: "+1 (555) 123-4567",
    address: {
      street: "456 Wellness Boulevard",
      city: "Beverly Hills",
      state: "CA",
      zip: "90210",
      country: "United States",
    },
    paymentMethod: {
      type: "Visa",
      last4: "4242",
    },
  },
  subscription: {
    plan: "Professional Plan",
    locations: 3,
    monthlyPrice: 299,
    setupFee: 99,
    billingCycle: "Monthly",
  },
  metrics: {
    emailsPerMonth: 5000,
    textsPerMonth: 2000,
    locations: 3,
    staffAccounts: 15,
    clientCapacity: 10000,
  },
  subtotal: 897,
  tax: 71.76,
  total: 968.76,
};

const SessionDetails = ({ sessionId }: { sessionId: string }) => {
  const { data, isLoading, error } = useQuery(
    trpc.payments.getSessionDetails.queryOptions({ sessionId: sessionId })
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };
  if (isLoading || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        {/* <Clock className="animate-spin h-16 w-16 text-primary mb-6" /> */}
        <ClockLoader />
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Preparing your subscription...
        </h2>
        <p className="text-muted-foreground mb-4">
          Please wait while we finalize your order and activate your account.
        </p>
        <div className="w-64 h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary animate-pulse"
            style={{ width: "70%" }}
          />
        </div>
      </div>
    );
  }

  const {
    billingDetails,
    currentPeriodEnd,
    currentPeriodStart,
    date,
    maximumEmails,
    maximumTexts,
    monthlyPricePerLocation,
    numberOfLocations,
    orderNumber,
  } = data;
  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Success Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <CheckCircle className="h-16 w-16 text-green-600" />
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Welcome to Zenapt
          </h1>

          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Your booking management system is now active. Start streamlining
            your med spa operations today with our comprehensive platform.
          </p>
          <Badge variant="secondary" className="mt-4">
            <Building2 className="h-4 w-4 mr-1" />
            {numberOfLocations} Location
            {numberOfLocations > 1 ? "s" : ""} Activated
          </Badge>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Subscription Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Subscription Details
              </CardTitle>
              <p
                className="text-sm cursor-pointer text-muted-foreground"
                onClick={() => navigator.clipboard.writeText(orderNumber)}
              >
                Order #{orderNumber.substring(0, 15)}... • {date}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h4 className="font-medium text-card-foreground">
                    Your Plan
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {numberOfLocations} location
                    {numberOfLocations > 1 ? "s" : ""} • monthly billing
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">
                    ${monthlyPricePerLocation / 100} per location
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>
                    {numberOfLocations} location
                    {numberOfLocations > 1 ? "s" : ""} × $
                    {monthlyPricePerLocation / 100} per location
                  </span>
                  <span>
                    {formatCurrency(
                      numberOfLocations * (monthlyPricePerLocation / 100)
                    )}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span className="text-primary">
                    {formatCurrency(
                      numberOfLocations * (monthlyPricePerLocation / 100)
                    )}
                  </span>
                </div>
              </div>

              <Button
                // onClick={handleDownloadInvoice}
                className="w-full mt-6"
                size="lg"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Invoice
              </Button>
            </CardContent>
          </Card>

          {/* Business & Billing Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-muted-foreground" />
                Business & Subscription Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Business Info */}
              <div>
                <h4 className="font-medium mb-3 text-card-foreground">
                  Business Information
                </h4>
                <div className="space-y-2 text-sm">
                  <p className="font-medium text-card-foreground capitalize">
                    {billingDetails.name}
                  </p>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{billingDetails.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground capitalize" />
                    <span>{billingDetails.businessName}</span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Billing Address */}
              <div>
                <h4 className="font-medium mb-3 text-card-foreground flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Subscription Details
                </h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p className="font-medium text-card-foreground">
                    Start Date:{" "}
                  </p>
                  <p>{currentPeriodStart.toLocaleString()}</p>
                  <p className="font-medium text-card-foreground">
                    Next Billing Date:{" "}
                  </p>
                  <p>{currentPeriodEnd.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* What You Got Section */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Your MedSpa Pro Features</CardTitle>
            <p className="text-muted-foreground">
              Your subscription includes comprehensive booking management tools
              and communication features:
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-3 mb-8">
              <div className="text-center p-4 bg-muted rounded-lg">
                <Mail className="h-8 w-8 text-primary mx-auto mb-2" />
                <div className="text-2xl font-bold text-foreground">
                  {new Intl.NumberFormat().format(maximumEmails)}
                </div>
                <div className="text-sm text-muted-foreground">
                  Emails per month
                </div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <MessageSquare className="h-8 w-8 text-primary mx-auto mb-2" />
                <div className="text-2xl font-bold text-foreground">
                  {new Intl.NumberFormat().format(maximumTexts)}
                </div>
                <div className="text-sm text-muted-foreground">
                  SMS messages per month
                </div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <Users className="h-8 w-8 text-primary mx-auto mb-2" />
                <div className="text-2xl font-bold text-foreground">
                  Unlimited
                </div>
                <div className="text-sm text-muted-foreground">
                  Client capacity
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-card-foreground">
                    Online Booking System
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    24/7 online booking with automated confirmations, reminders,
                    and calendar sync across all {numberOfLocations} locations.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-card-foreground">
                    Client Management
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Comprehensive client profiles, treatment history, and
                    automated follow-up campaigns for unlimited clients.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-card-foreground">
                    Staff Management
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Unlimited staff accounts with role-based permissions,
                    scheduling, and performance tracking.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-card-foreground">
                    Multi-Location Support
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Centralized management for all {numberOfLocations} locations
                    with location-specific reporting and inventory tracking.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-card-foreground">
                    Automated Communications
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {new Intl.NumberFormat().format(maximumEmails)} emails and{" "}
                    {new Intl.NumberFormat().format(maximumTexts)} SMS messages
                    monthly for appointment reminders and marketing campaigns.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-card-foreground">
                    Analytics & Reporting
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Real-time dashboards, revenue tracking, and detailed reports
                    to optimize your med spa operations.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Next Steps */}
        <div className="mt-12 text-center">
          <h3 className="text-xl font-semibold mb-4 text-foreground">
            Ready to Get Started?
          </h3>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg">Access Dashboard</Button>
            <Button variant="outline" size="lg">
              Contact Support
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionDetails;
