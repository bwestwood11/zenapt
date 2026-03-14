import {
  canAccess,
  getUserAccessContext,
  ROLE_PERMISSIONS,
  type Permission,
} from "../lib/subscription/permissions";
import { premiumProcedure, router } from "../lib/trpc";

// Overloads to preserve inference

const getPermission = premiumProcedure.query(async ({ ctx, input }) => {
  const userAccessContext = await getUserAccessContext(ctx.session.user.id);
  const orgId = ctx.session.user.organizationId;

  if (!orgId) {
    return {
      organizationRoles: null,
      locationsRoles: null,
      organizationPermissions: null,
      locationPermissions: null,
    };
  }
  const organizationRoles = userAccessContext.orgRoles[orgId];

  const organizationPermissions = organizationRoles.flatMap((r) => {
    return ROLE_PERMISSIONS["ORG"][r];
  });

  const locationRoles = userAccessContext.locationRoles;
  const locationPermissions: Record<string, Permission[]> = {};

  Object.entries(locationRoles).map(([locationId, roles]) => {
    locationPermissions[locationId] = roles.flatMap((r) => {
      return ROLE_PERMISSIONS["LOCATION"][r];
    });
  });

  return {
    organizationRoles,
    locationRoles,
    locationPermissions,
    organizationPermissions,
  };
});

export const permissionRouter = router({
  getPermission: getPermission,
});
