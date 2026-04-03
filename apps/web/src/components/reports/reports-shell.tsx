"use client";

import { SetBreadcrumbs } from "@/components/breadcrumbs";
import { ReportsNavigation } from "@/components/reports/reports-navigation";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ReportsShellProps = Readonly<{
  title: string;
  description: string;
  breadcrumbHref: string;
  breadcrumbLabel: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}>;

export function ReportsShell(props: ReportsShellProps) {
  const {
    title,
    description,
    breadcrumbHref,
    breadcrumbLabel,
    actions,
    children,
  } = props;

  return (
    <main className="p-4 md:p-6">
      <SetBreadcrumbs items={[{ href: breadcrumbHref, label: breadcrumbLabel }]} />

      <div className="mx-auto max-w-7xl space-y-6">
        <Card className="overflow-hidden rounded-3xl border-border/60 bg-background/95 shadow-sm backdrop-blur">
          <CardHeader className="gap-6 p-5 sm:p-6 lg:p-8">
            <div className="space-y-3">
              <div className="inline-flex w-fit items-center rounded-full border border-border/60 bg-muted/20 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                Reporting workspace
              </div>
              <div className="space-y-2">
                <CardTitle className="text-3xl tracking-tight sm:text-4xl">{title}</CardTitle>
                <CardDescription className="max-w-3xl text-sm leading-7 sm:text-base">
                  {description}
                </CardDescription>
              </div>
            </div>

            <div className="min-w-0">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Browse reports
              </p>
              <ReportsNavigation />
            </div>

            {actions ? (
              <div className="flex flex-col gap-3 border-t border-border/50 pt-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  Filters
                </p>
                <div className="flex flex-wrap items-center gap-2">{actions}</div>
              </div>
            ) : null}
          </CardHeader>
        </Card>

        {children}
      </div>
    </main>
  );
}
