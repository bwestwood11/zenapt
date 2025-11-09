"use client";

import { ChevronsUpDown, Home } from "lucide-react";
import { Select as SelectPrimitive } from "radix-ui";
import NotificationMenu from "@/components/notification-menu";
import UserMenu from "@/components/user-menu";
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { SidebarTrigger } from "./ui/sidebar";
import { Separator } from "./ui/separator";
import { useBreadcrumbStore } from "@/hooks/breadcrumbs";
import React from "react";

export default function ClientNavbar() {
  const breadcrumbs = useBreadcrumbStore((s) => s.breadcrumbs);

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
                  <React.Fragment key={bc.href}>
                    <BreadcrumbSeparator>/</BreadcrumbSeparator>
                    <>
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
                    </>
                  </React.Fragment>
                );
              })}
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-4">
          <NotificationMenu />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
