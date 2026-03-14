import { getLocationAccess } from "@/lib/permissions/permission";
import { forbidden } from "next/navigation";

export default async function EmployeesLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}>) {
  const { slug } = await params;

  if (!slug) {
    return forbidden();
  }

  const locationAccess = await getLocationAccess(slug);
  if (!locationAccess) {
    return forbidden();
  }

  const isManagement =
    locationAccess.role === "ORGANIZATION_MANAGEMENT" ||
    locationAccess.role === "LOCATION_ADMIN";

  if (!isManagement) {
    return forbidden();
  }

  return <>{children}</>;
}
