"use client";

import { User, LogOut, Settings } from "lucide-react";
import React from "react";
import { STEPS } from "./steps";
import { Button } from "../ui/button";
import { useCheckoutStore } from "./hooks/useStore";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOrganization } from "./hooks/useOrganization";
import { useCustomerSession } from "./hooks/useCustomerSession";
import { useMutation } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";

type UserType = "customer" | "guest" | "unauthorized";

const useCustomSession = () => {
  const session = useCustomerSession();

  // Determine user type based on session data
  const getUserType = (): UserType => {
    if (!session?.data?.user) return "guest";

    if (session.data.customer) {
      return "customer";
    }

    // If logged in but not a customer (employee/management), they're unauthorized
    return "unauthorized";
  };

  const userType = getUserType();

  return {
    userType,
    isCustomer: userType === "customer",
    isGuest: userType === "guest",
    isUnauthorized: userType === "unauthorized",
    data: session?.data || null,
    isPending: session?.isLoading || false,
    error: session?.error || null,
    refetch: session?.refetch,
  } as const;
};
const Header = () => {
  const organization = useOrganization().organization;
  const { step } = useCheckoutStore();
  const currentPageIndex = STEPS.findIndex((v) => v.id === step);
  const currentStep = STEPS.find((v) => v.id === step);
  const totalSteps = STEPS.length;
  const session = useCustomSession();
  const user = session.data?.user;
  const router = useRouter();
  const { mutateAsync: logout } = useMutation(
    trpc.customerAuth.logout.mutationOptions(),
  );
  const userInitials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : (user?.email?.slice(0, 2).toUpperCase() ?? "CU");

  const handleLoginClick = () => {
    // Get current widget URL to return to after login
    const returnUrl = globalThis.window.location.href;
    globalThis.window.open(
      `${globalThis.window.location.origin}/customer-login?return=${encodeURIComponent(returnUrl)}`,
      "_blank",
    );
  };

  // Show error if user is logged in but not a customer
  if (session.isUnauthorized) {
    return (
      <div className="w-full bg-sidebar border-r border-sidebar-border p-8 flex flex-col">
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-primary rounded-md shadow-sm" />
            <span className="font-semibold text-lg text-foreground">
              Serenity Medspa
            </span>
          </div>
        </div>
        <div className="flex items-center justify-center flex-1">
          <div className="text-center space-y-3">
            <div className="text-destructive font-semibold text-lg">
              Access Denied
            </div>
            <p className="text-muted-foreground text-sm">
              This booking portal is for customers only. Please log in with a
              customer account.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-gradient-to-b from-sidebar/50 to-sidebar border-b border-sidebar-border p-6 lg:p-8 flex flex-col shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-primary to-primary/80 rounded-lg shadow-md flex items-center justify-center">
            <svg className="w-5 h-5 text-primary-foreground" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 11H9v-2h2v2zm0-4H9V5h2v4z"/>
            </svg>
          </div>
          <span className="font-bold text-xl text-foreground tracking-tight">
            {organization?.name ?? "Serenity Medspa"}
          </span>
        </div>
        {session.isCustomer && user ? (
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="group flex items-center gap-3 rounded-full border border-transparent bg-primary/5 px-2 py-1 transition-all hover:border-primary/20 hover:bg-primary/10"
              >
                <div className="relative">
                  <Avatar className="h-9 w-9 ring-2 ring-primary/20 transition-transform group-hover:scale-105">
                    <AvatarImage
                      src={user.image ?? ""}
                      alt={user.name ?? "User"}
                    />
                    <AvatarFallback>{userInitials}</AvatarFallback>
                  </Avatar>
                  <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-sidebar bg-emerald-500" />
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    Logged in
                  </div>
                  <div className="text-sm font-semibold text-foreground">
                    {user.name ?? user.email ?? "Customer"}
                  </div>
                </div>
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0">
              <div className="overflow-hidden rounded-xl border border-border/60 bg-popover shadow-xl">
                <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12 ring-2 ring-primary/20">
                      <AvatarImage
                        src={user.image ?? ""}
                        alt={user.name ?? "User"}
                      />
                      <AvatarFallback>{userInitials}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">
                        {user.name ?? "Customer"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {user.email}
                      </p>
                      <span className="mt-2 inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.2em] text-emerald-600">
                        Customer
                      </span>
                    </div>
                  </div>
                </div>
                <div className="border-t border-border/60 p-3">
                  <div className="grid grid-cols-1 gap-2">
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="justify-start"
                    >
                      <Link href="/dashboard/manage-account">
                        <Settings className="mr-2 h-4 w-4" />
                        Manage account
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="justify-start"
                      onClick={() => {
                        void logout().then(() => {
                          session.refetch?.();
                          router.push("/");
                        });
                      }}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign out
                    </Button>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 bg-primary/30 rounded-full hover:bg-primary/50 transition-colors cursor-pointer"
            onClick={handleLoginClick}
            title="Sign in to your account"
          >
            <User className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Progress */}
      <div className="mb-10">
        <div className="text-sm font-semibold text-foreground mb-3 tracking-wide">
          Step {currentPageIndex + 1} of {totalSteps}: {currentStep?.title}
        </div>
        <div className="h-1.5 w-full bg-sidebar-border rounded-full overflow-hidden">
          <div
            style={{
              width: ((currentPageIndex + 1) / totalSteps) * 100 + "%",
            }}
            className="h-full bg-primary rounded-full shadow-sm"
          />
        </div>
      </div>
    </div>
  );
};

export default Header;
