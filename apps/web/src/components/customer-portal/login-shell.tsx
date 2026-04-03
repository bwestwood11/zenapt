"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import React from "react";

import { CustomerPortalLoginForm } from "@/components/customer-portal/login-form";
import { Button } from "@/components/ui/button";
import { trpc } from "@/utils/trpc";

type CustomerPortalLoginShellProps = Readonly<{
  orgId: string;
  returnUrl?: string;
}>;

export function CustomerPortalLoginShell({
  orgId,
  returnUrl,
}: CustomerPortalLoginShellProps) {
  const router = useRouter();
  const organizationQuery = useQuery(
    trpc.public.getOrganization.queryOptions({ orgId }),
  );
  const sessionQuery = useQuery(trpc.customerAuth.session.queryOptions());

  React.useEffect(() => {
    if (sessionQuery.data?.customer.orgId === orgId) {
      router.replace(`/c/${orgId}/dashboard`);
    }
  }, [orgId, router, sessionQuery.data?.customer.orgId]);

  if (organizationQuery.isLoading || sessionQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!organizationQuery.data && !organizationQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md rounded-2xl border border-border/70 bg-card p-6 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-foreground">
            Organization not found
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This customer portal link is invalid or no longer active.
          </p>
          <Button className="mt-5" onClick={() => router.push("/")}>
            Go to homepage
          </Button>
        </div>
      </div>
    );
  }

  const organization = organizationQuery.data;

  return (
    <CustomerPortalLoginForm
      organizationId={orgId}
      organizationName={organization?.name ?? "Organization"}
      organizationDescription={organization?.description}
      defaultReturnUrl={returnUrl}
    />
  );
}
