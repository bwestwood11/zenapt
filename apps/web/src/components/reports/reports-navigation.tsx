"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, BriefcaseBusiness, DollarSign, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

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
    <div className="flex flex-wrap gap-2">
      {reportLinks.map((item) => {
        const Icon = item.icon;
        const isActive =
          item.href === "/dashboard/reports"
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Button
            key={item.href}
            asChild
            variant={isActive ? "default" : "outline"}
            size="sm"
          >
            <Link href={item.href}>
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          </Button>
        );
      })}
    </div>
  );
}
