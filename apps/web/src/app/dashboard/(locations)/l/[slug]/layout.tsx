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
    throw forbidden();
  }
  const hasAccess = await hasAccessToLocation(slug);
  if (!hasAccess) {
    throw redirect("/dashboard");
  }
  return <div>{children}</div>;
};
export default DashboardLayout;
