import { CustomersTable } from "@/components/customers/CustomersTable";
import { ExportCustomersButton } from "@/components/customers/ExportCustomersButton";
import { SpecialistCustomersTable } from "@/components/customers/SpecialistCustomersTable";
import { getLocationAccess } from "@/lib/permissions/permission";
import { forbidden } from "next/navigation";

const CustomersPage = async ({
  params,
}: Readonly<{
  params: Promise<{ slug: string }>;
}>) => {
  const { slug } = await params;

  if (!slug) {
    return forbidden();
  }

  const locationAccess = await getLocationAccess(slug);
  if (!locationAccess) {
    return forbidden();
  }

  const canAccessCustomers =
    locationAccess.role === "ORGANIZATION_MANAGEMENT" ||
    locationAccess.role === "LOCATION_ADMIN" ||
    locationAccess.role === "LOCATION_FRONT_DESK" ||
    locationAccess.role === "LOCATION_SPECIALIST";

  if (!canAccessCustomers) {
    return forbidden();
  }

  const isSpecialist = locationAccess.role === "LOCATION_SPECIALIST";

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {isSpecialist ? "My Customers" : "Customers"}
        </h1>
        {isSpecialist ? null : (
          <ExportCustomersButton locationId={locationAccess.locationId} />
        )}
      </div>
      {isSpecialist ? (
        <SpecialistCustomersTable
          locationId={locationAccess.locationId}
          slug={slug}
        />
      ) : (
        <CustomersTable locationId={locationAccess.locationId} slug={slug} />
      )}
    </div>
  );
};

export default CustomersPage;
