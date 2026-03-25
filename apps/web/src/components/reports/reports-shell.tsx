"use client";

import { SetBreadcrumbs } from "@/components/breadcrumbs";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ReportsNavigation } from "@/components/reports/reports-navigation";

type ReportsShellProps = Readonly<{
  title: string;
  description: string;
  breadcrumbHref: string;
  breadcrumbLabel: string;
  children: React.ReactNode;
}>;

export function ReportsShell(props: ReportsShellProps) {
  const { title, description, breadcrumbHref, breadcrumbLabel, children } = props;

  return (
    <main className="p-4 md:p-6">
      <SetBreadcrumbs items={[{ href: breadcrumbHref, label: breadcrumbLabel }]} />

      <div className="mx-auto max-w-7xl space-y-6">
        <Card>
          <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-2xl">{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
            <ReportsNavigation />
          </CardHeader>
        </Card>

        {children}
      </div>
    </main>
  );
}
