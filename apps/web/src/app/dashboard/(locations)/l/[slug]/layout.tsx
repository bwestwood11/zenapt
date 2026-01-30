import ClientNavbar from "@/components/client-navbar";
import { ClientSidebar } from "@/components/sidebar/client-sidebar";
import { SidebarInset } from "@/components/ui/sidebar";
import { hasAccessToLocation } from "@/lib/permissions/permission";
import { forbidden, redirect } from "next/navigation";

const DashboardLayout = async ({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}>) => {
  const { slug } = await params;

  if (!slug) {
    return forbidden();
  }
  const hasAccess = await hasAccessToLocation(slug);
  if (!hasAccess) {
    throw redirect("/dashboard");
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
export default DashboardLayout;
