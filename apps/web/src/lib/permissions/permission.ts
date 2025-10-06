type Params = {
  locationId?: string;
};

import { serverTRPC } from "@/utils/server-trpc";
import type { Permission } from "../../../../server/src/lib/subscription/permissions";
import { authClient } from "../auth-client";
import { getSession } from "../auth/session";

export const checkPermission = async (
  required: Permission[],
  params: Params
) => {
  try {
    const permissions = await serverTRPC.permissions.getPermission.fetch();
    if (!permissions) return false;
    const { locationId } = params;

    const granted: Permission[] = [
      ...(permissions.organizationPermissions || []),
      ...(locationId
        ? permissions.locationPermissions?.[locationId] || []
        : []),
    ];

    const hasAccessToLocation = locationId
      ? !!permissions.locationPermissions?.[locationId]
      : true;

    return (
      required.every((perm) => granted.includes(perm)) && hasAccessToLocation
    );
  } catch (error) {
    console.error(error);
    return false;
  }
};

export const hasAccessToLocation = async (slug: string) => {
  try {
    const session = await getSession();

    if (!session) return false;

    const location = session.data?.user.employees?.find(
      (emp) => emp.locationSlug === slug
    );
    if (!location) return false;
    return true;
  } catch (error) {
    console.error(error);
  }
};
