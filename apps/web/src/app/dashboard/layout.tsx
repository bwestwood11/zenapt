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
    return redirect("/onboarding");
  }

  if(!session.user.management && session.session.token){
    return redirect("/onboarding");
  }


  if(!session.user.organizationId) {
    return <p>You Don't Have any organization If you are admin contact support if you are employee contact admin or support</p>
  }



  // Check if he paid
  const subscription = await getSubscription();

  if (!subscription?.isActive) {
    return redirect("/checkout");
  }

  return <div>{children}</div>;
};

export default DashboardLayout;
