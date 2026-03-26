"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
  CircleDashed,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

import { trpc } from "@/utils/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const formatTextLabel = (value: string) =>
  value
    .replaceAll(/[._]/g, " ")
    .replaceAll(/\s+/g, " ")
    .trim()
    .replaceAll(/\b\w/g, (letter) => letter.toUpperCase());

const formatCurrency = (value: string | null | undefined) =>
  value ? value.toUpperCase() : "—";

const statusMeta = {
  complete: {
    label: "Ready",
    icon: CheckCircle2,
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  warning: {
    label: "Needs attention",
    icon: AlertCircle,
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  pending: {
    label: "Pending",
    icon: CircleDashed,
    className: "border-slate-200 bg-slate-50 text-slate-700",
  },
} as const;

type StatusTone = keyof typeof statusMeta;

type StripeRequirements = {
  currentlyDue: string[];
  eventuallyDue: string[];
  pastDue: string[];
  pendingVerification: string[];
  disabledReason: string | null;
};

type StripeAccountOverview = {
  id: string;
  email: string | null;
  country: string | null;
  defaultCurrency: string | null;
  businessType: string | null;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  onboardingComplete: boolean;
  requirements: StripeRequirements;
};

type StripeOverview = {
  stripeAccountId: string | null;
  account: StripeAccountOverview | null;
};

function StatusRow({
  label,
  description,
  tone,
}: Readonly<{
  label: string;
  description: string;
  tone: StatusTone;
}>) {
  const meta = statusMeta[tone];
  const Icon = meta.icon;

  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-border/60 p-4">
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Badge variant="outline" className={cn("gap-1.5", meta.className)}>
        <Icon className="h-3.5 w-3.5" />
        {meta.label}
      </Badge>
    </div>
  );
}

function StripeConnectLoadingState() {
  return (
    <div className="flex min-h-[240px] items-center justify-center rounded-xl border border-dashed border-border/70">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  );
}

function DisconnectedStripeCard({
  isCreating,
  onConnect,
}: Readonly<{
  isCreating: boolean;
  onConnect: () => Promise<void>;
}>) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Stripe Connect</CardTitle>
        <CardDescription>
          Connect your Stripe account to receive payouts and manage payments.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Badge variant="outline" className="w-fit border-slate-200 bg-slate-50 text-slate-700">
          Not connected
        </Badge>
        <p className="text-sm text-muted-foreground">
          Once connected, this page will show onboarding status, payout readiness,
          and a direct link to your Stripe management dashboard.
        </p>
        <Button isLoading={isCreating} onClick={onConnect}>
          Connect Stripe
        </Button>
      </CardContent>
    </Card>
  );
}

function AccountSummaryGrid({
  account,
}: Readonly<{
  account: StripeAccountOverview | null;
}>) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <div className="rounded-lg border border-border/60 p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Email</p>
        <p className="mt-2 break-all text-sm font-medium text-foreground">
          {account?.email ?? "—"}
        </p>
      </div>
      <div className="rounded-lg border border-border/60 p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Country</p>
        <p className="mt-2 text-sm font-medium text-foreground">
          {account?.country ?? "—"}
        </p>
      </div>
      <div className="rounded-lg border border-border/60 p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Default currency
        </p>
        <p className="mt-2 text-sm font-medium text-foreground">
          {formatCurrency(account?.defaultCurrency)}
        </p>
      </div>
      <div className="rounded-lg border border-border/60 p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Business type
        </p>
        <p className="mt-2 text-sm font-medium text-foreground">
          {account?.businessType ? formatTextLabel(account.businessType) : "—"}
        </p>
      </div>
    </div>
  );
}

function StripeUnavailableNotice() {
  return (
    <div className="rounded-lg border border-dashed border-border/70 p-4 text-sm text-muted-foreground">
      Stripe is connected, but live account details could not be loaded right now.
      You can still open the Stripe dashboard or retry onboarding.
    </div>
  );
}

function ReadinessSection({
  account,
}: Readonly<{
  account: StripeAccountOverview;
}>) {
  return (
    <>
      <Separator />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Account readiness</h3>
          <StatusRow
            label="Details submitted"
            description="Business and payout details have been submitted to Stripe."
            tone={account.detailsSubmitted ? "complete" : "pending"}
          />
          <StatusRow
            label="Charges enabled"
            description="Your organization can collect payments through Stripe."
            tone={account.chargesEnabled ? "complete" : "warning"}
          />
          <StatusRow
            label="Payouts enabled"
            description="Stripe can transfer funds to your connected bank account."
            tone={account.payoutsEnabled ? "complete" : "warning"}
          />
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">
            Verification requirements
          </h3>
          <StatusRow
            label="Currently due"
            description={
              account.requirements.currentlyDue.length > 0
                ? `${account.requirements.currentlyDue.length} item(s) still need to be submitted.`
                : "No information is currently required."
            }
            tone={
              account.requirements.currentlyDue.length > 0 ? "warning" : "complete"
            }
          />
          <StatusRow
            label="Past due"
            description={
              account.requirements.pastDue.length > 0
                ? `${account.requirements.pastDue.length} overdue item(s) are blocking full activation.`
                : "No overdue requirements found."
            }
            tone={account.requirements.pastDue.length > 0 ? "warning" : "complete"}
          />
          <StatusRow
            label="Pending verification"
            description={
              account.requirements.pendingVerification.length > 0
                ? `${account.requirements.pendingVerification.length} item(s) are being reviewed by Stripe.`
                : "Stripe is not currently reviewing any submitted items."
            }
            tone={
              account.requirements.pendingVerification.length > 0
                ? "pending"
                : "complete"
            }
          />
        </div>
      </div>
    </>
  );
}

function RequirementList({
  title,
  items,
  emptyText,
}: Readonly<{
  title: string;
  items: string[];
  emptyText: string;
}>) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      {items.length > 0 ? (
        <ul className="space-y-2 text-sm text-foreground">
          {items.map((item) => (
            <li key={item} className="rounded-md border border-border/60 px-3 py-2">
              {formatTextLabel(item)}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      )}
    </div>
  );
}

function NextStepsSection({
  account,
}: Readonly<{
  account: StripeAccountOverview;
}>) {
  const hasRequirements = Boolean(
    account.requirements.currentlyDue.length ||
      account.requirements.pastDue.length ||
      account.requirements.pendingVerification.length,
  );

  if (!hasRequirements) {
    return null;
  }

  return (
    <div className="space-y-4 rounded-xl border border-border/60 bg-muted/20 p-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Next steps</h3>
        <p className="text-sm text-muted-foreground">
          Review the items below in Stripe to finish activation and unlock payouts.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <RequirementList
          title="Currently due"
          items={account.requirements.currentlyDue}
          emptyText="Nothing due right now."
        />
        <RequirementList
          title="Past due"
          items={account.requirements.pastDue}
          emptyText="No overdue items."
        />
        <RequirementList
          title="Pending verification"
          items={account.requirements.pendingVerification}
          emptyText="No items awaiting review."
        />
      </div>

      {account.requirements.disabledReason && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <span className="font-medium">Disabled reason:</span>{" "}
          {formatTextLabel(account.requirements.disabledReason)}
        </div>
      )}
    </div>
  );
}

function ConnectedStripeCard({
  stripeOverview,
  isCreating,
  isOpeningDashboard,
  onConnect,
  onOpenDashboard,
}: Readonly<{
  stripeOverview: StripeOverview;
  isCreating: boolean;
  isOpeningDashboard: boolean;
  onConnect: () => Promise<void>;
  onOpenDashboard: () => Promise<void>;
}>) {
  const account = stripeOverview.account;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Stripe Connect</CardTitle>
          <CardDescription>
            View your connection status, finish onboarding, or jump to Stripe.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <Badge
              variant="outline"
              className={cn(
                "w-fit",
                account?.onboardingComplete
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-amber-200 bg-amber-50 text-amber-700",
              )}
            >
              {account?.onboardingComplete ? "Connected" : "Onboarding incomplete"}
            </Badge>
            <Badge variant="outline" className="w-fit">
              Account: {stripeOverview.stripeAccountId}
            </Badge>
          </div>

          <AccountSummaryGrid account={account} />

          <div className="flex flex-wrap gap-3">
            <Button isLoading={isOpeningDashboard} onClick={onOpenDashboard}>
              Open Stripe Dashboard
              <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
            <Button variant="outline" isLoading={isCreating} onClick={onConnect}>
              {account?.onboardingComplete
                ? "Update Stripe details"
                : "Continue Stripe setup"}
            </Button>
          </div>

          {account ? <ReadinessSection account={account} /> : <StripeUnavailableNotice />}

          {account ? <NextStepsSection account={account} /> : null}
        </CardContent>
      </Card>
    </div>
  );
}

export function StripeConnectSettings() {
  const { data: stripeOverview, isLoading } = useQuery(
    trpc.organization.getStripeConnectOverview.queryOptions(),
  );
  const { mutateAsync: createStripeConnectAccount, isPending: isCreating } =
    useMutation(trpc.organization.createStripeConnectAccount.mutationOptions());
  const { mutateAsync: getStripeDashboardLink, isPending: isOpeningDashboard } =
    useMutation(trpc.organization.getStripeDashboardLink.mutationOptions());

  const isConnected = Boolean(stripeOverview?.stripeAccountId);

  const handleConnect = async () => {
    try {
      const result = await createStripeConnectAccount();
      if (result.url) {
        globalThis.location.assign(result.url);
      }
    } catch {
      toast.error("Unable to open Stripe onboarding right now.");
    }
  };

  const handleOpenDashboard = async () => {
    try {
      const result = await getStripeDashboardLink();
      if (result.url) {
        globalThis.location.assign(result.url);
      }
    } catch {
      toast.error("Unable to open the Stripe dashboard right now.");
    }
  };

  if (isLoading) {
    return <StripeConnectLoadingState />;
  }

  if (!isConnected) {
    return (
      <DisconnectedStripeCard
        isCreating={isCreating}
        onConnect={handleConnect}
      />
    );
  }

  return (
    <ConnectedStripeCard
      stripeOverview={stripeOverview as StripeOverview}
      isCreating={isCreating}
      isOpeningDashboard={isOpeningDashboard}
      onConnect={handleConnect}
      onOpenDashboard={handleOpenDashboard}
    />
  );
}
