"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { queryClient } from "@/utils/trpc";
import { ThemeProvider } from "./theme-provider";
import { Toaster } from "./ui/sonner";
import { SidebarProvider } from "@/components/ui/sidebar";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { ConfirmProvider } from "./ui/confirm";

export default function Providers({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <ConfirmProvider>
        <NuqsAdapter>
          <SidebarProvider>
            <QueryClientProvider client={queryClient}>
              {children}
              <ReactQueryDevtools />
            </QueryClientProvider>
          </SidebarProvider>
        </NuqsAdapter>
      </ConfirmProvider>

      <Toaster richColors />
    </ThemeProvider>
  );
}
