import { getSession } from "@/lib/auth/session";
import { getSubscription } from "@/lib/payments/subscriptions";
import { hasAccessToLocation } from "@/lib/permissions/permission";
import { forbidden, redirect } from "next/navigation";

const DashboardLayout = async ({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locId: string }>;
}>) => {
  const { locId } = await params;

  if (!locId) {
    throw forbidden();
  }
  const hasAccess = await hasAccessToLocation(locId);
  if (!hasAccess) {
    throw redirect("/dashboard");
  }
  return <div>{children}</div>;
};
export default DashboardLayout;
