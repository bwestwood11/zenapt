"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Briefcase,
  CalendarCheck2,
  CalendarDays,
  Clock,
  Coffee,
  LayoutDashboard,
  LogOut,
  Settings,
  UserPlus,
  Users,
} from "lucide-react";

import { authClient } from "@/lib/auth-client";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

type EmployeeRole =
  | "ORGANIZATION_MANAGEMENT"
  | "LOCATION_ADMIN"
  | "LOCATION_FRONT_DESK"
  | "LOCATION_SPECIALIST";

type NavItem = {
  title: string;
  href: string;
  icon: React.ComponentType<{
    className?: string;
    size?: number;
    "aria-hidden"?: boolean;
  }>;
  exact?: boolean;
  allowedRoles: EmployeeRole[];
};

type LocationSidebarProps = React.ComponentProps<typeof Sidebar> & {
  slug: string;
};

const ROLE_LABEL: Record<EmployeeRole, string> = {
  ORGANIZATION_MANAGEMENT: "Organization Management",
  LOCATION_ADMIN: "Location Admin",
  LOCATION_FRONT_DESK: "Front Desk",
  LOCATION_SPECIALIST: "Specialist",
};

const ALL_EMPLOYEE_ROLES: EmployeeRole[] = [
  "ORGANIZATION_MANAGEMENT",
  "LOCATION_ADMIN",
  "LOCATION_FRONT_DESK",
  "LOCATION_SPECIALIST",
];

const MANAGER_ROLES: EmployeeRole[] = [
  "ORGANIZATION_MANAGEMENT",
  "LOCATION_ADMIN",
];

const CUSTOMER_ROLES: EmployeeRole[] = [
  "ORGANIZATION_MANAGEMENT",
  "LOCATION_ADMIN",
  "LOCATION_FRONT_DESK",
  "LOCATION_SPECIALIST",
];

const BREAK_MANAGEMENT_ROLES: EmployeeRole[] = [
  "ORGANIZATION_MANAGEMENT",
  "LOCATION_ADMIN",
  "LOCATION_FRONT_DESK",
];

const SPECIALIST_ROLES: EmployeeRole[] = ["LOCATION_SPECIALIST"];

const isItemActive = (pathName: string, href: string, exact?: boolean) => {
  if (exact) {
    return pathName === href;
  }

  return pathName === href || pathName.startsWith(`${href}/`);
};

export function LocationSidebar({ slug, ...props }: LocationSidebarProps) {
  const router = useRouter();
  const pathName = usePathname();
  const { data: session } = authClient.useSession();
  const basePath = `/dashboard/l/${slug}`;

  const currentEmployee = session?.user.employees?.find(
    (employee) => employee.locationSlug === slug,
  );

  const role: EmployeeRole =
    (currentEmployee?.role as EmployeeRole | undefined) ??
    (session?.user.management?.role
      ? "ORGANIZATION_MANAGEMENT"
      : "LOCATION_SPECIALIST");

  const locationItems: NavItem[] = [
    {
      title: "Dashboard",
      href: basePath,
      icon: LayoutDashboard,
      exact: true,
      allowedRoles: ALL_EMPLOYEE_ROLES,
    },
    {
      title: "Appointments",
      href: `${basePath}/appointments`,
      icon: CalendarCheck2,
      allowedRoles: ALL_EMPLOYEE_ROLES,
    },
    {
      title: "Calendar",
      href: `${basePath}/calendar`,
      icon: CalendarDays,
      allowedRoles: SPECIALIST_ROLES,
    },
    {
      title: "Master Calendar",
      href: `${basePath}/master-calendar`,
      icon: CalendarDays,
      allowedRoles: MANAGER_ROLES,
    },
    {
      title: "Customers",
      href: `${basePath}/customers`,
      icon: Users,
      allowedRoles: CUSTOMER_ROLES,
    },
    {
      title: "My Services",
      href: `${basePath}/my-services`,
      icon: Briefcase,
      allowedRoles: SPECIALIST_ROLES,
    },
    {
      title: "My Working Hours",
      href: `${basePath}/my-working-hours`,
      icon: Clock,
      allowedRoles: SPECIALIST_ROLES,
    },
    {
      title: "Timeoff Requests",
      href: `${basePath}/timeoff-requests`,
      icon: CalendarCheck2,
      allowedRoles: ALL_EMPLOYEE_ROLES,
    },
    {
      title: "Recurring Breaks",
      href: `${basePath}/breaks`,
      icon: Coffee,
      allowedRoles: BREAK_MANAGEMENT_ROLES,
    },
    {
      title: "Settings",
      href: `${basePath}/settings`,
      icon: Settings,
      allowedRoles: ALL_EMPLOYEE_ROLES,
    },
    {
      title: "Employees",
      href: `${basePath}/employees`,
      icon: UserPlus,
      allowedRoles: MANAGER_ROLES,
    },
    {
      title: "Location Settings",
      href: `${basePath}/location-settings`,
      icon: Settings,
      allowedRoles: MANAGER_ROLES,
    },
  ];

  const filteredItems = locationItems.filter((item) =>
    item.allowedRoles.includes(role),
  );

  return (
    <Sidebar {...props}>
      <SidebarHeader className="h-16 px-6 py-0">
        <div className="flex h-full items-center gap-3">
          <Image src="/logo.svg" alt="Zenapt" width={40} height={40} priority />
          <Image
            src="/logo-text.svg"
            alt="Zenapt"
            width={100}
            height={40}
            priority
          />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="uppercase text-muted-foreground/60">
            Location
          </SidebarGroupLabel>
          <SidebarGroupContent className="px-2">
            <SidebarMenu>
              {filteredItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isItemActive(pathName, item.href, item.exact)}
                  >
                    <Link href={item.href}>
                      <item.icon
                        className="text-muted-foreground/60 group-data-[active=true]/menu-button:text-background"
                        size={22}
                        aria-hidden
                      />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {role === "ORGANIZATION_MANAGEMENT" ? (
          <SidebarGroup>
            <SidebarGroupLabel className="uppercase text-muted-foreground/60">
              Navigation
            </SidebarGroupLabel>
            <SidebarGroupContent className="px-2">
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathName.startsWith("/dashboard/home")}
                  >
                    <Link href="/dashboard/home">
                      <LayoutDashboard
                        className="text-muted-foreground/60 group-data-[active=true]/menu-button:text-background"
                        size={22}
                        aria-hidden
                      />
                      <span>Master Dashboard</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}
      </SidebarContent>

      <SidebarFooter>
        <hr className="-mt-px mx-2 border-t border-border" />
        <div className="px-3 py-2">
          <p className="truncate text-sm font-semibold text-foreground">
            {session?.user.name ?? "User"}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {session?.user.email ?? ""}
          </p>
          <p className="mt-1 text-xs text-muted-foreground/90">
            {ROLE_LABEL[role]}
          </p>
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => {
                authClient.signOut({
                  fetchOptions: {
                    onSuccess: () => {
                      router.push("/");
                    },
                  },
                });
              }}
            >
              <LogOut
                className="text-muted-foreground/60"
                size={22}
                aria-hidden
              />
              <span>Sign Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
