import { getSession } from "@/lib/auth/session";
import { getSubscription } from "@/lib/payments/subscriptions";
import { redirect } from "next/navigation";

const DashboardLayout = async ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  const { data: session } = await getSession();
  if (!session || !session.user.id) {
    return redirect("/login");
  }

  // Check if he is onboarded
  if (!session.user.management?.organizationId && session.user.management?.role === "OWNER") {
    return redirect("/dashboard/onboarding");
  }
  // Check if he paid
  const subscription = await getSubscription();
  if (!subscription?.isActive) {
    return redirect("/checkout");
  }
  return <div>{children}</div>;
};

export default DashboardLayout;
