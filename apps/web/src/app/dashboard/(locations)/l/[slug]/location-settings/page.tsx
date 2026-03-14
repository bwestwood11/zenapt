import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Settings,
  Clock,
  CalendarDays,
  XCircle,
  MessageSquare,
  Palette,
  DollarSign,
  Shield,
  Sparkles,
  HandCoins,
  TicketPercent,
} from "lucide-react";

import { OperatingSchedulingSettings } from "@/components/locations/location-settings.tsx/operating-scheduling-settings";
import { HolidayExceptionSettings } from "@/components/locations/location-settings.tsx/holiday-exception-settings";
import { BookingCancellationSettings } from "@/components/locations/location-settings.tsx/booking-cancellation-settings";
import { ClientCommunicationSettings } from "@/components/locations/location-settings.tsx/client-communication-settings";
import { BrandingDisplaySettings } from "@/components/locations/location-settings.tsx/branding-display-settings";
import { PaymentBusinessSettings } from "@/components/locations/location-settings.tsx/payment-business.settings";
import { ComplianceConsentSettings } from "@/components/locations/location-settings.tsx/compliance-consent-settings";
import { BonusSettings } from "@/components/locations/location-settings.tsx/bonus-settings";
import { TipSettings } from "@/components/locations/location-settings.tsx/tip-settings";
import { PromoCodeSettings } from "@/components/locations/location-settings.tsx/promo-code-settings";
import { getLocationAccess } from "@/lib/permissions/permission";
import { forbidden } from "next/navigation";

export default async function LocationSettingsPage({
  params,
}: Readonly<{
  params: Promise<{ slug: string }>;
}>) {
  const { slug } = await params;

  if (!slug) {
    return forbidden();
  }

  const locId = await getLocationAccess(slug);
  if (!locId) {
    return forbidden();
  }

  const isManagement =
    locId.role === "ORGANIZATION_MANAGEMENT" ||
    locId.role === "LOCATION_ADMIN";

  if (!isManagement) {
    return forbidden();
  }
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between border-b border-border pb-6">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-lg bg-primary">
              <Settings className="size-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-balance text-3xl font-bold tracking-tight text-foreground">
                Location Settings
              </h1>
              <p className="text-pretty text-sm text-muted-foreground">
                Configure operational preferences, scheduling, and policies for
                this location
              </p>
            </div>
          </div>
          {/* <Button onClick={handleSaveSettings} disabled={isSaving} size="lg">
            <Save className="mr-2 size-4" />
            {isSaving ? "Saving..." : "Save Changes"}
          </Button> */}
        </div>

        <Tabs defaultValue="operating" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-10 gap-1 h-auto bg-muted p-1">
            <TabsTrigger
              value="operating"
              className="flex items-center gap-2 data-[state=active]:bg-background"
            >
              <Clock className="size-4" />
              <span className="hidden sm:inline">Operating</span>
            </TabsTrigger>
            <TabsTrigger
              value="holidays"
              className="flex items-center gap-2 data-[state=active]:bg-background"
            >
              <CalendarDays className="size-4" />
              <span className="hidden sm:inline">Holidays</span>
            </TabsTrigger>
            <TabsTrigger
              value="booking"
              className="flex items-center gap-2 data-[state=active]:bg-background"
            >
              <XCircle className="size-4" />
              <span className="hidden sm:inline">Booking</span>
            </TabsTrigger>
            <TabsTrigger
              value="communication"
              className="flex items-center gap-2 data-[state=active]:bg-background"
            >
              <MessageSquare className="size-4" />
              <span className="hidden sm:inline">Communication</span>
            </TabsTrigger>
            <TabsTrigger
              value="branding"
              className="flex items-center gap-2 data-[state=active]:bg-background"
            >
              <Palette className="size-4" />
              <span className="hidden sm:inline">Branding</span>
            </TabsTrigger>
            <TabsTrigger
              value="payment"
              className="flex items-center gap-2 data-[state=active]:bg-background"
            >
              <DollarSign className="size-4" />
              <span className="hidden sm:inline">Payment</span>
            </TabsTrigger>
            <TabsTrigger
              value="tip"
              className="flex items-center gap-2 data-[state=active]:bg-background"
            >
              <HandCoins className="size-4" />
              <span className="hidden sm:inline">Tip</span>
            </TabsTrigger>
            <TabsTrigger
              value="promo"
              className="flex items-center gap-2 data-[state=active]:bg-background"
            >
              <TicketPercent className="size-4" />
              <span className="hidden sm:inline">Promo</span>
            </TabsTrigger>
            <TabsTrigger
              value="compliance"
              className="flex items-center gap-2 data-[state=active]:bg-background"
            >
              <Shield className="size-4" />
              <span className="hidden sm:inline">Compliance</span>
            </TabsTrigger>
            <TabsTrigger
              value="advanced"
              className="flex items-center gap-2 data-[state=active]:bg-background"
            >
              <Sparkles className="size-4" />
              <span className="hidden sm:inline">Advanced</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="operating" className="space-y-6">
            <OperatingSchedulingSettings locationId={locId.locationId} />
          </TabsContent>

          <TabsContent value="holidays" className="space-y-6">
            <HolidayExceptionSettings locationId={locId.locationId} />
          </TabsContent>

          <TabsContent value="booking" className="space-y-6">
            <BookingCancellationSettings />
          </TabsContent>

          <TabsContent value="communication" className="space-y-6">
            <ClientCommunicationSettings />
          </TabsContent>

          <TabsContent value="branding" className="space-y-6">
            <BrandingDisplaySettings />
          </TabsContent>

          <TabsContent value="payment" className="space-y-6">
            <PaymentBusinessSettings />
          </TabsContent>

          <TabsContent value="tip" className="space-y-6">
            <TipSettings locationId={locId.locationId} />
          </TabsContent>

          <TabsContent value="promo" className="space-y-6">
            <PromoCodeSettings locationId={locId.locationId} />
          </TabsContent>

          <TabsContent value="compliance" className="space-y-6">
            <ComplianceConsentSettings />
          </TabsContent>

          <TabsContent value="advanced" className="space-y-6">
            <BonusSettings />
          </TabsContent>
        </Tabs>

        {/* Sticky Bottom Save Button */}
        {/* <div className="mt-8 flex justify-end border-t border-border pt-6">
          <Button onClick={handleSaveSettings} disabled={isSaving} size="lg">
            <Save className="mr-2 size-4" />
            {isSaving ? "Saving..." : "Save All Changes"}
          </Button>
        </div> */}
      </div>
    </div>
  );
}
