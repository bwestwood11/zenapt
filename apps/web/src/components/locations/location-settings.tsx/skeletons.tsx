import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function LocationSettingsHeaderSkeleton() {
  return (
    <div className="mb-8 flex items-center justify-between border-b border-border pb-6">
      <div className="flex items-center gap-3">
        <Skeleton className="size-12 rounded-lg" />
        <div className="space-y-3">
          <Skeleton className="h-8 w-64 max-w-full" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
      </div>
    </div>
  );
}

function LocationSettingsTabsSkeleton() {
  return (
    <div className="grid w-full grid-cols-4 gap-1 rounded-md bg-muted p-1 lg:grid-cols-10">
      {Array.from({ length: 7 }, (_, index) => (
        <Skeleton key={`location-settings-tab-${index + 1}`} className="h-10 w-full" />
      ))}
    </div>
  );
}

function CardHeaderSkeleton() {
  return (
    <CardHeader className="space-y-3">
      <div className="flex items-center gap-2">
        <Skeleton className="size-5 rounded-full" />
        <Skeleton className="h-6 w-64 max-w-full" />
      </div>
      <Skeleton className="h-4 w-[26rem] max-w-full" />
    </CardHeader>
  );
}

function FormFieldSkeleton({
  labelWidth = "w-36",
  inputHeight = "h-10",
  className = "w-full",
}: Readonly<{
  labelWidth?: string;
  inputHeight?: string;
  className?: string;
}>) {
  return (
    <div className="space-y-2">
      <Skeleton className={`h-4 ${labelWidth}`} />
      <Skeleton className={`${inputHeight} ${className}`} />
    </div>
  );
}

export function LocationSettingsPageSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <LocationSettingsHeaderSkeleton />

        <div className="space-y-6">
          <LocationSettingsTabsSkeleton />
          <OperatingSchedulingSettingsSkeleton />
        </div>
      </div>
    </div>
  );
}

export function OperatingSchedulingSettingsSkeleton() {
  const days = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];

  return (
    <Card>
      <CardHeaderSkeleton />
      <CardContent className="space-y-6">
        <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
          <Skeleton className="h-5 w-44" />

          <div className="grid gap-4 sm:grid-cols-2">
            {days.map((day) => (
              <div key={day} className="flex items-center gap-3">
                <Skeleton className="h-6 w-10 rounded-full" />
                <Skeleton className="h-4 min-w-[80px] w-20" />
                <Skeleton className="h-10 w-28" />
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-10 w-28" />
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <FormFieldSkeleton />
          <FormFieldSkeleton labelWidth="w-44" />
          <FormFieldSkeleton labelWidth="w-40" />
          <FormFieldSkeleton labelWidth="w-44" />
          <FormFieldSkeleton labelWidth="w-48" />
        </div>

        <div className="flex justify-end">
          <Skeleton className="h-10 w-32" />
        </div>
      </CardContent>
    </Card>
  );
}

export function HolidayExceptionSettingsSkeleton() {
  return (
    <Card>
      <CardHeaderSkeleton />
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Skeleton className="h-5 w-56" />

          <div className="space-y-2">
            {Array.from({ length: 3 }, (_, index) => (
              <div
                key={`holiday-skeleton-${index + 1}`}
                className="flex items-center justify-between rounded-lg border border-border bg-card p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-4 w-36" />
                  </div>
                  <Skeleton className="h-5 w-28" />
                </div>

                <Skeleton className="size-9" />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
          <div className="flex items-center justify-between gap-4">
            <Skeleton className="h-5 w-60 max-w-full" />
            <Skeleton className="h-9 w-36" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormFieldSkeleton labelWidth="w-24" />
            <FormFieldSkeleton labelWidth="w-12" className="w-48" />
            <FormFieldSkeleton labelWidth="w-32" />
          </div>

          <div className="flex justify-between">
            <Skeleton className="h-9 w-32" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function BrandingDisplaySettingsSkeleton() {
  return (
    <Card>
      <CardHeaderSkeleton />
      <CardContent className="space-y-8">
        <div className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <Skeleton className="size-24 rounded-xl" />
                <div className="space-y-2">
                  <Skeleton className="h-10 w-32" />
                  <Skeleton className="h-3 w-40" />
                </div>
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <FormFieldSkeleton labelWidth="w-32" />
              <FormFieldSkeleton labelWidth="w-28" />
            </div>

            <FormFieldSkeleton labelWidth="w-36" inputHeight="h-28" />
            <FormFieldSkeleton labelWidth="w-28" inputHeight="h-28" />
            <FormFieldSkeleton labelWidth="w-36" />
          </div>

          <div className="space-y-4">
            <div className="overflow-hidden rounded-2xl border bg-muted/30 shadow-sm">
              <div className="space-y-4 bg-background/85 p-6 backdrop-blur-sm">
                <div className="flex items-center gap-4">
                  <Skeleton className="size-16 rounded-xl" />
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-36" />
                    <Skeleton className="h-4 w-56 max-w-full" />
                  </div>
                </div>

                <div className="space-y-3 rounded-xl border bg-card p-4">
                  {Array.from({ length: 4 }, (_, index) => (
                    <div
                      key={`branding-preview-skeleton-${index + 1}`}
                      className="flex items-start gap-3"
                    >
                      <Skeleton className="mt-0.5 size-4 rounded-full" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-full" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Skeleton className="h-10 w-44" />
        </div>
      </CardContent>
    </Card>
  );
}

export function TipSettingsSkeleton() {
  return (
    <Card>
      <CardHeaderSkeleton />
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-4">
          <div className="space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-80 max-w-full" />
          </div>
          <Skeleton className="h-6 w-10 rounded-full" />
        </div>

        <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-4 w-96 max-w-full" />

          <div className="space-y-3">
            <Skeleton className="h-3 w-16" />
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 7 }, (_, index) => (
                <Skeleton key={`tip-quick-skeleton-${index + 1}`} className="h-9 w-16" />
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Skeleton className="h-3 w-20" />
            <div className="flex flex-col gap-2 sm:flex-row">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 w-28" />
            </div>
          </div>

          <div className="space-y-3">
            <Skeleton className="h-3 w-40" />
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 4 }, (_, index) => (
                <Skeleton key={`tip-selected-skeleton-${index + 1}`} className="h-6 w-14" />
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Skeleton className="h-10 w-32" />
        </div>
      </CardContent>
    </Card>
  );
}

export function PromoCodeSettingsSkeleton() {
  return (
    <Card>
      <CardHeaderSkeleton />
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormFieldSkeleton labelWidth="w-12" />
          <FormFieldSkeleton labelWidth="w-24" />
          <FormFieldSkeleton labelWidth="w-36" />
          <FormFieldSkeleton labelWidth="w-28" />

          <div className="flex justify-end sm:col-span-2">
            <Skeleton className="h-10 w-36" />
          </div>
        </div>

        <div className="space-y-3">
          <Skeleton className="h-4 w-48" />
          <div className="space-y-2">
            {Array.from({ length: 3 }, (_, index) => (
              <div
                key={`promo-code-skeleton-${index + 1}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-14" />
                  </div>
                  <Skeleton className="h-4 w-64 max-w-full" />
                  <Skeleton className="h-4 w-40" />
                </div>

                <div className="flex items-center gap-2">
                  <Skeleton className="h-9 w-20" />
                  <Skeleton className="h-9 w-9" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}