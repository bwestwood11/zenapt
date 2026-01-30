import { getLocationAccess } from "@/lib/permissions/permission";
import { forbidden, redirect } from "next/navigation";
import React from "react";

const SettingsPage = async ({
  params,
}: {
  params: Promise<{ slug: string }>;
}) => {
  const { slug } = await params;

  if (!slug) {
    return forbidden();
  }

  const session = await getLocationAccess(slug);
  if (!session) {
    return forbidden();
  }

  const role = session.role;

  if (role === "ORGANIZATION_MANAGEMENT") {
    return redirect("/location-settings");
  }

  return <div>SettingsPage</div>;
};

export default SettingsPage;
