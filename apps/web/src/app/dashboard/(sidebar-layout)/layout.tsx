import ClientNavbar from "@/components/client-navbar";
import { ClientSidebar } from "@/components/sidebar/client-sidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import React from "react";

const SidebarLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="w-full flex ">
      <ClientSidebar  />

      <SidebarInset className="overflow-hidden min-h-svh">
        <ClientNavbar />
        {children}
      </SidebarInset>
    </div>
  );
};

export default SidebarLayout;
