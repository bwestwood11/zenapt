"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, BriefcaseBusiness, DollarSign, Sparkles, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const reportLinks = [
  {
    href: "/dashboard/reports",
    label: "Overview",
    icon: Sparkles,
  },
  {
    href: "/dashboard/reports/metrics",
    label: "Metrics",
    icon: BarChart3,
  },
  {
    href: "/dashboard/reports/sales",
    label: "Sales",
    icon: DollarSign,
  },
  {
    href: "/dashboard/reports/customers",
    label: "Customers",
    icon: Users,
  },
  {
    href: "/dashboard/reports/specialists",
    label: "Specialists",
    icon: BriefcaseBusiness,
  },
] as const;

export function ReportsNavigation() {
  const pathname = usePathname();

  return (
    <div className="overflow-x-auto pb-1">
      <div className="inline-flex min-w-max items-center gap-1 rounded-2xl border border-border/60 bg-muted/20 p-1.5">
      {reportLinks.map((item) => {
        const Icon = item.icon;
        const isActive =
          item.href === "/dashboard/reports"
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-all",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-background hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{item.label}</span>
          </Link>
        );
      })}
      </div>
    </div>
  );
}
