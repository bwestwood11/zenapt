"use client";

import { BusinessProfile } from "@/components/business-settings/general-settings";
import { OrganizationEmailSettings } from "@/components/business-settings/email-settings";
import { MembersTable } from "@/components/business-settings/members-table";
import { OrganizationPromoCodes } from "@/components/business-settings/promo-codes";
import { StripeConnectSettings } from "@/components/business-settings/stripe-connect-settings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { parseAsString, useQueryState } from "nuqs";
import type { Permission } from "../../../../../../../server/src/lib/subscription/permissions";
import { usePermissions } from "@/lib/permissions/usePermissions";
import { Loader2 } from "lucide-react";

const settingsTabs = [
  {
    key: "general",
    label: "General",
    requiredPermissions: ["UPDATE::ORGANIZATION"] as Permission[], // everyone can access
  },
  {
    key: "email",
    label: "Email",
    requiredPermissions: ["UPDATE::ORGANIZATION"] as Permission[],
  },
  {
    key: "billing",
    label: "Billing",
    requiredPermissions: ["UPDATE::SUBSCRIPTION"] as Permission[],
  },
  {
    key: "members",
    label: "Members",
    requiredPermissions: ["UPDATE::MEMBERS"] as Permission[],
  },
  {
    key: "privacy",
    label: "Privacy",
    requiredPermissions: [] as Permission[],
  },
  {
    key: "promo",
    label: "Promo Codes",
    requiredPermissions: ["UPDATE::ORGANIZATION"] as Permission[],
  },
] as const;

export default function SettingsPage() {
  const [currentTab, setCurrentTab] = useQueryState(
    "tab",
    parseAsString.withDefault("general").withOptions({ clearOnDefault: false }),
  );

  const { checkPermission, isLoadingPermissions } = usePermissions();

  // Handle loading state early
  if (isLoadingPermissions) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Filter tabs based on permissions
  const visibleTabs = settingsTabs.filter((tab) =>
    checkPermission(tab.requiredPermissions),
  );

  // If currentTab isn’t allowed, redirect to first visible tab
  const allowedTab = visibleTabs.some((t) => t.key === currentTab)
    ? currentTab
    : (visibleTabs[0]?.key ?? "general");

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-6 py-8 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-sans text-4xl font-bold tracking-tight text-foreground">
            Settings
          </h1>
        </div>

        <Tabs
          value={allowedTab}
          onValueChange={setCurrentTab}
          className="w-full"
        >
          <TabsList className="h-auto w-full justify-start gap-8 rounded-none border-b border-border bg-transparent p-0">
            {visibleTabs.map((tab) => (
              <TabsTrigger
                key={tab.key}
                value={tab.key}
                className="relative rounded-none border-b-2 border-transparent bg-transparent px-0 pb-4 pt-0 font-medium text-muted-foreground data-[state=active]:border-b-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Content section */}
          {visibleTabs.map((tab) => (
            <TabsContent
              key={tab.key}
              value={tab.key}
              className="mt-12 space-y-12"
            >
              {tab.key === "general" && <BusinessProfile />}
              {tab.key === "email" && <OrganizationEmailSettings />}
              {tab.key === "billing" && <StripeConnectSettings />}
              {tab.key === "members" && <MembersTable />}
              {tab.key === "privacy" && (
                <p className="text-muted-foreground">
                  Privacy settings content
                </p>
              )}
              {tab.key === "promo" && <OrganizationPromoCodes />}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}
