
import ClientNavbar from "@/components/client-navbar";
import { ClientSidebar } from "@/components/sidebar/client-sidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { getSession } from "@/lib/auth/session";
import { forbidden } from "next/navigation";
import React from "react";

const SidebarLayout = async ({ children }: { children: React.ReactNode }) => {
   const { data: session } = await getSession();

   if(!session?.user.management?.role){
      throw forbidden()
   }

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
