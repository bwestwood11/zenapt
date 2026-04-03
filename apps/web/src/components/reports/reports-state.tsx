"use client";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function ReportsLoadingState({
  message = "Loading report...",
}: Readonly<{
  message?: string;
}>) {
  return (
    <main className="p-4 md:p-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <Card className="w-full overflow-hidden rounded-3xl border-border/60 bg-background/95 shadow-sm backdrop-blur">
          <CardHeader className="gap-6 p-5 sm:p-6 lg:p-8">
            <div className="space-y-3">
              <Skeleton className="h-6 w-36 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-10 w-52 max-w-full" />
                <Skeleton className="h-4 w-full max-w-4xl" />
                <Skeleton className="h-4 w-full max-w-3xl" />
              </div>
            </div>

            <div className="space-y-3">
              <Skeleton className="h-4 w-28" />
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-10 min-w-28 flex-1 rounded-xl sm:flex-none sm:w-28" />
                <Skeleton className="h-10 min-w-24 flex-1 rounded-xl sm:flex-none sm:w-24" />
                <Skeleton className="h-10 min-w-24 flex-1 rounded-xl sm:flex-none sm:w-24" />
                <Skeleton className="h-10 min-w-28 flex-1 rounded-xl sm:flex-none sm:w-28" />
                <Skeleton className="h-10 min-w-28 flex-1 rounded-xl sm:flex-none sm:w-28" />
              </div>
            </div>

            <div className="space-y-3 border-t border-border/50 pt-4">
              <Skeleton className="h-4 w-16" />
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-10 flex-1 rounded-xl sm:w-56 sm:flex-none" />
                <Skeleton className="h-10 flex-1 rounded-xl sm:w-44 sm:flex-none" />
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="grid w-full gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Card key={`report-skeleton-metric-${index}`} className="w-full">
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-8 w-24" />
              </CardHeader>
              <div className="px-6 pb-6">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="mt-2 h-4 w-4/5" />
              </div>
            </Card>
          ))}
        </div>

        <div className="grid w-full gap-4 xl:grid-cols-2">
          {Array.from({ length: 2 }, (_, index) => (
            <Card key={`report-skeleton-chart-${index}`} className="w-full">
              <CardHeader>
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-full max-w-md" />
              </CardHeader>
              <div className="px-6 pb-6">
                <Skeleton className="h-72 w-full rounded-xl" />
              </div>
            </Card>
          ))}
        </div>

        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </main>
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
