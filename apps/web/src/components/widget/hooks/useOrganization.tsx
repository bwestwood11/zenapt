"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";

type OrganizationContextValue = {
  orgId: string;
  organization: {
    id: string;
    name: string;
    description: string | null;
    logo: string | null;
    slug: string;
  } | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
};

const OrganizationContext =
  React.createContext<OrganizationContextValue | null>(null);

type OrganizationProviderProps = {
  orgId: string;
  children: React.ReactNode;
};

export const OrganizationProvider = ({
  orgId,
  children,
}: OrganizationProviderProps) => {
  const query = useQuery(trpc.public.getOrganization.queryOptions({ orgId }));

  const value = React.useMemo<OrganizationContextValue>(
    () => ({
      orgId,
      organization: query.data ?? null,
      isLoading: query.isLoading,
      isError: query.isError,
      error: query.error instanceof Error ? query.error : null,
      refetch: query.refetch,
    }),
    [
      orgId,
      query.data,
      query.error,
      query.isError,
      query.isLoading,
      query.refetch,
    ],
  );

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
};

export const useOrganization = () => {
  const context = React.useContext(OrganizationContext);

  if (!context) {
    throw new Error("useOrganization must be used within OrganizationProvider");
  }

  return context;
};
