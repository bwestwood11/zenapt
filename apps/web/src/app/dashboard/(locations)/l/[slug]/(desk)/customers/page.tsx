import { getLocationAccess } from "@/lib/permissions/permission";
import { forbidden } from "next/navigation";
import React from "react";
import { CustomersTable } from "@/components/customers/CustomersTable";

const CustomersPage = async ({
  params,
}: {
  params: Promise<{ slug: string }>;
}) => {
  const { slug } = await params;

  if (!slug) {
    return forbidden();
  }

  const locId = await getLocationAccess(slug);
  if (!locId) {
    return forbidden();
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Customers</h1>
      <CustomersTable locationId={locId.locationId} />
    </div>
  );
};

export default CustomersPage;
