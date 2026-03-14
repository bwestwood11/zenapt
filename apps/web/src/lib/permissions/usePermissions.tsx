"use client";

import { useQuery } from "@tanstack/react-query";
import type { Permission } from "../../../../server/src/lib/subscription/permissions";
import { trpc } from "@/utils/trpc";
import { useCallback, type ReactNode } from "react";

export const usePermissions = (locationId?: string) => {
  const {
    data: permissions,
    isLoading: isLoadingPermissions,
    isError,
  } = useQuery(trpc.permissions.getPermission.queryOptions());

  const checkPermission = useCallback(
    (required: Permission[]) => {
      if (!permissions) return false;

      const granted: Permission[] = [
        ...(permissions.organizationPermissions || []),
        ...(locationId
          ? permissions.locationPermissions?.[locationId] || []
          : []),
      ];

      const hasAccessToLocation = locationId ? !!permissions.locationPermissions?.[locationId] : true

      return required.every((perm) => granted.includes(perm)) && hasAccessToLocation
    },
    [permissions, locationId]
  );

  return { checkPermission, isLoadingPermissions, isError };
};



type WithPermissionsProps = {
  locationId?: string;
  required: Permission[];
  children: ReactNode;
  fallback?: ReactNode; // optional UI if not allowed
};

export function WithPermissions({
  locationId,
  required,
  children,
  fallback = null,
}: WithPermissionsProps) {
  const { checkPermission, isLoadingPermissions, isError } =
    usePermissions(locationId);

  if (isLoadingPermissions) return null; // could be spinner if you want
  if (isError) return null; // or some error boundary fallback

  return checkPermission(required) ? <>{children}</> : <>{fallback}</>;
}

