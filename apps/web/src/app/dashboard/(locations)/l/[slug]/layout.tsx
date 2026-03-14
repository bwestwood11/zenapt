import ClientNavbar from "@/components/client-navbar";
import { SidebarInset } from "@/components/ui/sidebar";
import { hasAccessToLocation } from "@/lib/permissions/permission";
import { forbidden, redirect } from "next/navigation";
import LocationBreadcrumbs from "./_components/location-breadcrumbs";
import { LocationSidebar } from "@/components/sidebar/location-sidebar";

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
    return redirect("/dashboard");
  }

  return (
    <div className="flex w-full">
      <LocationSidebar slug={slug} />
      <SidebarInset className="overflow-hidden min-h-svh">
        <LocationBreadcrumbs slug={slug} />
        <ClientNavbar />
        {children}
      </SidebarInset>
    </div>
  );
};

export default DashboardLayout;
