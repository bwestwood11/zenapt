"use client";

import * as React from "react";

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
import {
  BarChart3,
  LayoutDashboard,
  ListChecks,
  Mail,
  Megaphone,
} from "lucide-react";
import { usePathname } from "next/navigation";
import Image from "next/image";

// This is sample data.
const data = {
  navMain: [
    {
      title: "Sections",
      url: "#",
      items: [
        {
          title: "Dashboard",
          url: "/dashboard",
          icon: LayoutDashboard,
        },
        {
          title: "Locations",
          url: "/dashboard/locations",
          icon: LayoutDashboard,
        },
        {
          title: "Services",
          url: "/dashboard/services",
          icon: LayoutDashboard,
        },
        {
          title: "Reports",
          url: "/dashboard/reports",
          icon: BarChart3,
        },
        {
          title: "Activity Log",
          url: "/dashboard/activity-log",
          icon: LayoutDashboard,
        },
      ],
    },
    {
      title: "Other",
      url: "#",
      items: [
        {
          title: "Company Settings",
          url: "/dashboard/settings",
          icon: LayoutDashboard,
        },
        {
          title: "Help Center",
          url: "#",
          icon: LayoutDashboard,
        },
      ],
    },
    {
      title: "Marketing",
      url: "#",
      items: [
        {
          title: "Templates",
          url: "/dashboard/marketing/templates",
          icon: Mail,
        },
        {
          title: "Contact Lists",
          url: "/dashboard/marketing/contact-lists",
          icon: ListChecks,
        },
        {
          title: "Campaigns",
          url: "/dashboard/marketing/campaigns",
          icon: Megaphone,
        },
      ],
    },
  ],
};

export function ClientSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const pathName = usePathname();
  return (
    <Sidebar {...props}>
      {" "}
      <SidebarHeader className="px-6 h-16 py-0 flex it">
        <div className="flex items-center gap-3 h-full">
          <Image src="/logo.svg" alt="Zenapt" width={40} height={40}  priority/>
          <Image src="/logo-text.svg" alt="Zenapt" width={100} height={40}  priority/>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {/* We create a SidebarGroup for each parent. */}
        {data.navMain.map((item) => (
          <SidebarGroup key={item.title}>
            <SidebarGroupLabel className="uppercase text-muted-foreground/60">
              {item.title}
            </SidebarGroupLabel>
            <SidebarGroupContent className="px-2">
              <SidebarMenu>
                {item.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathName === item.url || pathName.startsWith(`${item.url}/`)}
                      // className="group/menu-button font-medium gap-3 h-9 rounded-md bg-gradient-to-r hover:bg-transparent hover:from-sidebar-accent hover:to-sidebar-accent/40 data-[active=true]:from-primary/20 data-[active=true]:to-primary/5 [&>svg]:size-auto"
                    >
                      <a href={item.url}>
                        {item.icon && (
                          <item.icon
                            className="text-muted-foreground/60 group-data-[active=true]/menu-button:text-background"
                            size={22}
                            aria-hidden="true"
                          />
                        )}
                        <span>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <hr className="border-t border-border mx-2 -mt-px" />
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton className="font-medium gap-3 h-9 rounded-md bg-gradient-to-r hover:bg-transparent hover:from-sidebar-accent hover:to-sidebar-accent/40 data-[active=true]:from-primary/20 data-[active=true]:to-primary/5 [&>svg]:size-auto">
              <LayoutDashboard
                className="text-muted-foreground/60 group-data-[active=true]/menu-button:text-primary"
                size={22}
                aria-hidden="true"
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
