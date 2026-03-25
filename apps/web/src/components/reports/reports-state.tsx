"use client";

import { Loader2 } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function ReportsLoadingState({
  message = "Loading report...",
}: Readonly<{
  message?: string;
}>) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        {message}
      </div>
    </div>
  );
}

export function ReportsPermissionDeniedState() {
  return (
    <div className="mx-auto max-w-7xl p-4 md:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Reports</CardTitle>
          <CardDescription>
            You do not have permission to view this section.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}

export function ReportsEmptyState({
  title,
  description,
}: Readonly<{
  title: string;
  description: string;
}>) {
  return (
    <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
      <p className="font-medium text-foreground">{title}</p>
      <p className="mt-1">{description}</p>
    </div>
  );
}
