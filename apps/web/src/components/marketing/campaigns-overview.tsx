"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock3, ListChecks, Megaphone, Plus, Send, Users } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/utils/trpc";

type CampaignRecord = {
  id: string;
  title: string;
  description: string | null;
  status: "DRAFT" | "SENDING" | "SENT" | "FAILED";
  sentAt: string | Date | null;
  deliveryError: string | null;
  audienceCount: number;
  audienceSnapshotAt: string | Date | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  template: {
    id: string;
    title: string;
  };
  contactList: {
    id: string;
    name: string;
  };
};

export function CampaignsOverview() {
  const queryClient = useQueryClient();
  const campaignsQuery = useQuery(trpc.marketing.listCampaigns.queryOptions());
  const campaigns = (campaignsQuery.data ?? []) as CampaignRecord[];
  const sendCampaignMutation = useMutation(
    trpc.marketing.sendCampaign.mutationOptions({
      onSuccess: async (result) => {
        await queryClient.invalidateQueries({
          queryKey: trpc.marketing.listCampaigns.queryKey(),
        });
        const recipientLabel = `${result.recipientCount} recipient${result.recipientCount === 1 ? "" : "s"}`;
        const successMessage = result.deliveryMode === "console"
          ? `Campaign logged to console for ${recipientLabel}.`
          : `Campaign sent to ${recipientLabel}.`;

        toast.success(successMessage);
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-[28px] border border-border/60 bg-card px-6 py-6 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Marketing campaigns
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            All campaigns
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
            Build campaigns from templates and reusable contact-list filters. Each campaign stores
            a snapshot of the selected audience in Postgres.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline" size="lg">
            <Link href="/dashboard/marketing/contact-lists">
              <ListChecks className="h-4 w-4" />
              Manage contact lists
            </Link>
          </Button>
          <Button asChild size="lg">
            <Link href="/dashboard/marketing/campaigns/new">
              <Plus className="h-4 w-4" />
              Create campaign
            </Link>
          </Button>
        </div>
      </div>

      {campaignsQuery.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={`campaign-skeleton-${index + 1}`} className="rounded-[24px]">
              <CardHeader className="space-y-3">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
              <CardFooter>
                <Skeleton className="h-9 w-28" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : null}

      {!campaignsQuery.isLoading && campaigns.length === 0 ? (
        <Card className="rounded-[28px] border-dashed">
          <CardHeader>
            <CardTitle>No campaigns yet</CardTitle>
            <CardDescription>
              Pick a template, select a contact list, create a snapshot, and save your first
              campaign.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/dashboard/marketing/campaigns/new">
                <Plus className="h-4 w-4" />
                Create campaign
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard/marketing/contact-lists">Create contact list</Link>
            </Button>
          </CardFooter>
        </Card>
      ) : null}

      {!campaignsQuery.isLoading && campaigns.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {campaigns.map((campaign) => {
            const canSendCampaign = campaign.status === "DRAFT" || campaign.status === "FAILED";

            return (
              <Card key={campaign.id} className="rounded-[24px] border-border/60 transition-shadow hover:shadow-md">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <CardTitle className="line-clamp-1 text-lg">{campaign.title}</CardTitle>
                      <CardDescription className="line-clamp-2 min-h-10">
                        {campaign.description || "No description added yet."}
                      </CardDescription>
                    </div>
                    <div className="rounded-full border border-border/60 p-2 text-muted-foreground">
                      <Megaphone className="h-4 w-4" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <div className="flex flex-wrap items-center gap-2">
                    <CampaignStatusBadge status={campaign.status} />
                    {campaign.sentAt ? <span>Sent {formatDistanceToNow(toDate(campaign.sentAt), { addSuffix: true })}</span> : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    {campaign.audienceCount} saved recipient{campaign.audienceCount === 1 ? "" : "s"}
                  </div>
                  <div>Template: {campaign.template.title}</div>
                  <div>Contact list: {campaign.contactList.name}</div>
                  <div className="flex items-center gap-2">
                    <Clock3 className="h-4 w-4" />
                    Snapshot {formatDistanceToNow(toDate(campaign.audienceSnapshotAt ?? campaign.createdAt), { addSuffix: true })}
                  </div>
                  {campaign.deliveryError ? (
                    <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                      {campaign.deliveryError}
                    </div>
                  ) : null}
                </CardContent>
                <CardFooter className="flex flex-wrap justify-between gap-3">
                  <p className="truncate text-xs text-muted-foreground">ID: {campaign.id}</p>
                  <div className="flex flex-wrap gap-2">
                    {canSendCampaign ? (
                      <Button
                        variant="outline"
                        isLoading={sendCampaignMutation.isPending}
                        disabled={sendCampaignMutation.isPending || campaign.status === "SENDING"}
                        onClick={() => sendCampaignMutation.mutate({ id: campaign.id })}
                      >
                        <Send className="h-4 w-4" />
                        {campaign.status === "FAILED" ? "Retry send" : "Send campaign"}
                      </Button>
                    ) : null}
                    <Button asChild variant="outline">
                      <Link href="/dashboard/marketing/campaigns/new">Create another</Link>
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

const toDate = (value: string | Date) => {
  return value instanceof Date ? value : new Date(value);
};

function CampaignStatusBadge({
  status,
}: Readonly<{
  status: CampaignRecord["status"];
}>) {
  switch (status) {
    case "SENT":
      return <Badge variant="outline" className="border-emerald-600/30 bg-emerald-600/15 text-emerald-700">Sent</Badge>;
    case "SENDING":
      return <Badge variant="outline" className="border-amber-500/30 bg-amber-500/15 text-amber-700">Sending</Badge>;
    case "FAILED":
      return <Badge variant="outline" className="border-destructive/30 bg-destructive/10 text-destructive">Failed</Badge>;
    default:
      return <Badge variant="outline">Draft</Badge>;
  }
}