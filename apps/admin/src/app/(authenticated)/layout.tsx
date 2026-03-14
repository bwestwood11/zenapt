import { getServerSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession()
  if(!session) redirect("/login");

  
  return <div>{children}</div>;
}
