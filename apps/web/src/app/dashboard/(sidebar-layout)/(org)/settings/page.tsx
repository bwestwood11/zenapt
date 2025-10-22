"use client";

import { BusinessProfile } from "@/components/business-settings/general-settings";
import { MembersTable } from "@/components/business-settings/members-table";
import OrgInvForm from "@/components/invitations/organization-invite-form";
import OrganizationInvitationModal from "@/components/invitations/organization-invite-modal";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { parseAsString, useQueryState } from "nuqs";
import { useState } from "react";

export default function SettingsPage() {
  const [currentTab, setCurrentTab] = useQueryState(
    "tab",
    parseAsString.withDefault("general").withOptions({ clearOnDefault: false })
  );
 

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-6 py-8 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-sans text-4xl font-bold tracking-tight text-foreground">
            Settings
          </h1>
        </div>

        <Tabs
          value={currentTab}
          onValueChange={setCurrentTab}
          className="w-full"
        >
          <TabsList className="h-auto w-full justify-start gap-8 rounded-none border-b border-border bg-transparent p-0">
            <TabsTrigger
              value="general"
              className="relative rounded-none border-b-2 border-transparent bg-transparent px-0 pb-4 pt-0 font-medium text-muted-foreground data-[state=active]:border-b-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
            >
              General
            </TabsTrigger>
            <TabsTrigger
              value="account"
              className="relative rounded-none border-b-2 border-transparent bg-transparent px-0 pb-4 pt-0 font-medium text-muted-foreground data-[state=active]:border-b-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
            >
              Account
            </TabsTrigger>
            <TabsTrigger
              value="billing"
              className="relative rounded-none border-b-2 border-transparent bg-transparent px-0 pb-4 pt-0 font-medium text-muted-foreground data-[state=active]:border-b-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
            >
              Billing
            </TabsTrigger>
            <TabsTrigger
              value="members"
              className="relative rounded-none border-b-2 border-transparent bg-transparent px-0 pb-4 pt-0 font-medium text-muted-foreground data-[state=active]:border-b-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
            >
              Members
            </TabsTrigger>
            <TabsTrigger
              value="privacy"
              className="relative rounded-none border-b-2 border-transparent bg-transparent px-0 pb-4 pt-0 font-medium text-muted-foreground data-[state=active]:border-b-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
            >
              Privacy
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="mt-12 space-y-12">
            <BusinessProfile />
          </TabsContent>

          <TabsContent value="account" className="mt-12">
            <p className="text-muted-foreground">Account settings content</p>
          </TabsContent>

          <TabsContent value="billing" className="mt-12">
            <p className="text-muted-foreground">Billing settings content</p>
          </TabsContent>

          <TabsContent value="members" className="mt-12">
              <MembersTable />
          </TabsContent>

          <TabsContent value="privacy" className="mt-12">
            <p className="text-muted-foreground">Privacy settings content</p>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
