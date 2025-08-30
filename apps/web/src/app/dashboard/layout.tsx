import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

const DashboardLayout = async ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  const { data: session } = await getSession();

  if(!session || !session.user.id){
    return redirect("/login")
  }

  // Check if he is onboarded
  // Check if he paid
  
  return <div>{children}</div>;
};

export default DashboardLayout;
