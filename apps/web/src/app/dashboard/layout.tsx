import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

const DashboardLayout = async ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  const { data: session } = await getSession();
  console.log("DashboardLayout session", session);
  if (!session || !session.user.id) {
    return redirect("/login");
  }

  // Check if he is onboarded
  if (!session.user.organizationId && session.user.role === "OWNER") {
    return redirect("/dashboard/onboarding");
  }
  // Check if he paid

  return <div>{children}</div>;
};

export default DashboardLayout;
