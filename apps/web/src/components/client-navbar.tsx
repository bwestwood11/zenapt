"use client";

import { useMemo, useState } from "react";
import { Briefcase, Check, ChevronsUpDown, Home, MapPin, Shield, Users } from "lucide-react";
import NotificationMenu from "@/components/notification-menu";
import UserMenu from "@/components/user-menu";
import { authClient } from "@/lib/auth-client";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { SidebarTrigger } from "./ui/sidebar";
import { Separator } from "./ui/separator";
import { useBreadcrumbStore } from "@/hooks/breadcrumbs";
import { usePathname, useRouter } from "next/navigation";

type LocationOption = {
  slug: string;
  label: string;
  role: string;
  roleCode: string;
};

const formatLocationLabel = (slug: string) =>
  slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const formatRoleLabel = (roleCode: string) =>
  roleCode
    .replaceAll("_", " ")
    .toLowerCase()
    .split(" ")
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(" ");

const getRoleIcon = (roleCode: string) => {
  if (roleCode === "LOCATION_ADMIN" || roleCode === "ORGANIZATION_MANAGEMENT") {
    return Shield;
  }

  if (roleCode === "LOCATION_FRONT_DESK") {
    return Users;
  }

  return Briefcase;
};

export default function ClientNavbar() {
  const router = useRouter();
  const pathName = usePathname();
  const { data: session } = authClient.useSession();
  const breadcrumbs = useBreadcrumbStore((s) => s.breadcrumbs);
  const [locationOpen, setLocationOpen] = useState(false);

  const locations = useMemo<LocationOption[]>(() => {
    const employees = session?.user.employees ?? [];
    const uniqueBySlug = new Map<string, LocationOption>();

    for (const employee of employees) {
      if (!employee.locationSlug) {
        continue;
      }

      if (!uniqueBySlug.has(employee.locationSlug)) {
        uniqueBySlug.set(employee.locationSlug, {
          slug: employee.locationSlug,
          label: formatLocationLabel(employee.locationSlug),
          role: formatRoleLabel(employee.role),
          roleCode: employee.role,
        });
      }
    }

    return [...uniqueBySlug.values()];
  }, [session?.user.employees]);

  const activeLocationSlug = useMemo(() => {
    const segments = pathName.split("/");
    const locationSlugIndex = segments.indexOf("l") + 1;
    return segments[locationSlugIndex] || null;
  }, [pathName]);

  const activeLocation = locations.find((location) => location.slug === activeLocationSlug);
  const hasAdminDashboardAccess = Boolean(session?.user.management?.role);
  const isAdminDashboardActive = pathName.startsWith("/dashboard/home");
  const ActiveLabelIcon = isAdminDashboardActive ? Shield : MapPin;
  const dashboardSwitcherLabel = isAdminDashboardActive
    ? "Admin Dashboard"
    : (activeLocation?.label ?? "Dashboard");

  return (
    <header className="border-b px-4 ">
      <div className="flex h-16 items-center justify-between gap-4">
        {/* Left side */}
        <div className="flex items-center gap-5">
          <SidebarTrigger />
          <Separator orientation="vertical" className="!h-6" />
          <Breadcrumb>
            <BreadcrumbList>
              {/* Home */}
              <BreadcrumbItem>
                <BreadcrumbLink href="/">
                  <Home className="size-5 text-foreground/60 hover:text-foreground transition-colors" />
                </BreadcrumbLink>
              </BreadcrumbItem>

              {breadcrumbs.map((bc, i) => {
                const isLast = i === breadcrumbs.length - 1;

                return (
                  <span key={`${bc.href ?? bc.label}-${i}`} className="contents">
                    <BreadcrumbSeparator>/</BreadcrumbSeparator>
                    {isLast ? (
                      <BreadcrumbItem>
                        <BreadcrumbPage>{bc.label}</BreadcrumbPage>
                      </BreadcrumbItem>
                    ) : (
                      <BreadcrumbLink
                        href={bc.href ?? "#"}
                        className="text-foreground/60 hover:text-foreground transition-colors"
                      >
                        {bc.label}
                      </BreadcrumbLink>
                    )}
                  </span>
                );
              })}
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-4">
          {locations.length > 0 ? (
            <Popover open={locationOpen} onOpenChange={setLocationOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={locationOpen}
                  className="w-64 justify-between"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <ActiveLabelIcon className="h-4 w-4 shrink-0" />
                    <span className="truncate text-left">{dashboardSwitcherLabel}</span>
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-0" align="end">
                <Command>
                  <CommandInput placeholder="Search dashboard or location..." />
                  <CommandList>
                    <CommandEmpty>No result found.</CommandEmpty>
                    <CommandGroup>
                      {hasAdminDashboardAccess ? (
                        <CommandItem
                          value="admin dashboard master dashboard"
                          onSelect={() => {
                            router.push("/dashboard/home");
                            setLocationOpen(false);
                          }}
                        >
                          <Shield className="h-4 w-4" />
                          <div className="flex min-w-0 flex-col">
                            <span className="truncate">Admin Dashboard</span>
                            <span className="text-xs text-muted-foreground truncate">
                              Management
                            </span>
                          </div>
                          <Check
                            className={`ml-auto h-4 w-4 ${
                              isAdminDashboardActive ? "opacity-100" : "opacity-0"
                            }`}
                          />
                        </CommandItem>
                      ) : null}

                      {locations.map((location) => {
                        const LocationRoleIcon = getRoleIcon(location.roleCode);
                        const isLocationActive = location.slug === activeLocationSlug;

                        return (
                          <CommandItem
                            key={location.slug}
                            value={`${location.label} ${location.slug} ${location.role}`}
                            onSelect={() => {
                              router.push(`/dashboard/l/${location.slug}`);
                              setLocationOpen(false);
                            }}
                          >
                            <MapPin className="h-4 w-4" />
                            <div className="flex min-w-0 flex-col">
                              <span className="truncate">{location.label}</span>
                              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground truncate">
                                <LocationRoleIcon className="h-3 w-3 shrink-0" />
                                {location.role}
                              </span>
                            </div>
                            <Check
                              className={`ml-auto h-4 w-4 ${
                                isLocationActive ? "opacity-100" : "opacity-0"
                              }`}
                            />
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          ) : null}
          <NotificationMenu />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
