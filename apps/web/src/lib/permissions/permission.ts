type Params = {
  locationId?: string;
};

import { serverTRPC } from "@/utils/server-trpc";
import type { Permission } from "../../../../server/src/lib/subscription/permissions";
import { authClient } from "../auth-client";
import { getSession } from "../auth/session";
import { forbidden, redirect } from "next/navigation";

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

export const requirePermission = async (
  required: Permission[],
  params?: Params
) => {
  const hasPerm = await checkPermission(required, params ?? {});
  if (!hasPerm) {
    return forbidden();
  }

  return true;
};

const LoginRoute = "/login";

export const requireAuth = async (redirectUrl?: string) => {
  const { data: session } = await getSession();

  if (!session) {
    return redirect(redirectUrl ?? LoginRoute);
  }

  return true;
};

export const redirectIfAuthenticated = async (redirectUrl: string) => {
  const { data: session } = await getSession();

  if (!!session) {
    return redirect(redirectUrl);
  }

  return true;
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


export async function getLocationAccess(slug: string) {
  try {
    const session = await getSession();
    if (!session?.data?.user?.employees) return false;

    const match = session.data.user.employees.find(
      (emp) => emp.locationSlug === slug
    );

    return match ? match : false;
  } catch (err) {
    console.error("location access check failed:", err);
    return false;
  }
}