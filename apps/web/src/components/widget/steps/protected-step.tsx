"use client";

import React from "react";
import { authClient } from "@/lib/auth-client";
import { Loader2 } from "lucide-react";

interface ProtectedStepProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const ProtectedStep: React.FC<ProtectedStepProps> = ({
  children,
  fallback,
}) => {
  const session = authClient.useSession();

  // Force session refresh on mount
  React.useEffect(() => {
    const refreshSession = async () => {
      session.refetch();
    };
    refreshSession();
  }, []);

  // Check if user is authenticated as a customer
  const isCustomer =
    session?.data?.user?.customer !== null &&
    session?.data?.user?.customer !== undefined;

  // Show loading state while checking session
  if (session?.isPending) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // Show error state if there's an authentication error
  if (session?.error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3 max-w-md">
          <div className="text-destructive font-semibold text-lg">
            Authentication Error
          </div>
          <p className="text-muted-foreground text-sm">
            There was an error checking your authentication status. Please try
            refreshing the page.
          </p>
        </div>
      </div>
    );
  }

  // If not authenticated as customer, show fallback or unauthorized message
  if (!isCustomer) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3 max-w-md">
          <div className="text-destructive font-semibold text-lg">
            Authentication Required
          </div>
          <p className="text-muted-foreground text-sm">
            You must be logged in as a customer to access this page.
          </p>
        </div>
      </div>
    );
  }

  // User is authenticated as customer, render children
  return <>{children}</>;
};
