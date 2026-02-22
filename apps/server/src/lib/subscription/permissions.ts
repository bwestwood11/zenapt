import prisma from "../../../prisma";

/* ---------- Actions & Features ---------- */
export const ACTIONS = ["CREATE", "READ", "UPDATE", "DELETE"] as const;
export type Action = (typeof ACTIONS)[number];

export const FEATURES = [
  "LOCATION",
  "ADMIN_LOCATION",
  "SERVICES_TERMS",
  "SERVICES_GROUP",
  "SERVICE",
  "MEMBERS",
  "EMPLOYEES",
  "ORGANIZATION",
  "SUBSCRIPTION",
  "ANALYTICS",
  "MASTER_CALENDAR",
  "APPOINTMENTS",
  "CUSTOMERS",
] as const;

export type Feature = (typeof FEATURES)[number];

export type Permission = `${Action}::${Feature}`;

/* ---------- Org & Location Roles ---------- */
export const ORG_ROLES = ["OWNER", "ADMIN", "ANALYST"] as const;

// What Owner can do
// We are skipping permission check for owner so he can do anything he wants provided by the Zenapt

// What admin can and cannot do
// DO ANYTHING AT ORG LEVEL MANAGEMENT
// CANNOT ACCESS LOCATIONS BY DEFAULT
// IF OWNER WANTS TO GIVE ACCESS OF LOCATION TO ADMIN HE WILL GIVE HIM ROLE OF ORGANIZATION_MANAGEMENT FOR THAT LOCATION
// CANNOT DO ANY PAYMENT RELATED THINGS LIKE SUBSCRIBE, PAYMENTS etc
// HE CANNOT DELETE THE COMPANY OR ANY MAJOR DELETION

// WHAT Analyst can/cant do
// HE CAN JUST ACCESS ANALYTICS TABS
// HE CANNOT UPDATE ANYTHING AT ORGANIZATION LEVEL

export type OrgRole = (typeof ORG_ROLES)[number];

export const LOCATION_ROLES = [
  "LOCATION_ADMIN",
  "LOCATION_FRONT_DESK",
  "LOCATION_SPECIALIST",
  "ORGANIZATION_MANAGEMENT",
] as const;

export type LocationRole = (typeof LOCATION_ROLES)[number];

export type RolePermission = {
  ORG: Record<OrgRole, Permission[]>;
  LOCATION: Record<LocationRole, Permission[]>;
};

const addFeature = (feature: Feature, actions?: Action[]): Permission[] => {
  if (!actions) return ACTIONS.map((a) => `${a}::${feature}` as Permission);
  return actions.map((a) => `${a}::${feature}` as Permission);
};

/* ---------- Role → Permissions Map ---------- */
export const ROLE_PERMISSIONS: RolePermission = {
  ORG: {
    OWNER: ACTIONS.flatMap((a) =>
      FEATURES.map((f) => `${a}::${f}` as Permission),
    ),
    ADMIN: [
      ...addFeature("SERVICES_GROUP"),
      ...addFeature("SERVICES_TERMS"),
      ...addFeature("ANALYTICS"),
      ...addFeature("MEMBERS"),
      ...addFeature("CUSTOMERS"),
      "READ::ADMIN_LOCATION",
    ],
    ANALYST: ["READ::ANALYTICS"],
  },

  LOCATION: {
    LOCATION_ADMIN: [
      "READ::LOCATION",
      "UPDATE::LOCATION",
      "READ::EMPLOYEES",
      ...addFeature("SERVICE"),
      ...addFeature("MASTER_CALENDAR"),
      "CREATE::EMPLOYEES",
      ...addFeature("APPOINTMENTS"),
      ...addFeature("CUSTOMERS"),
    ],
    LOCATION_FRONT_DESK: [
      "READ::EMPLOYEES",
      "READ::SERVICE",
      ...addFeature("MASTER_CALENDAR"),
      ...addFeature("APPOINTMENTS"),
      ...addFeature("CUSTOMERS"),
    ],
    LOCATION_SPECIALIST: [
      "READ::LOCATION",
      "READ::EMPLOYEES",
      "READ::SERVICE",
      "READ::MASTER_CALENDAR",
      "READ::APPOINTMENTS",
      "CREATE::SERVICE",
      "UPDATE::SERVICE",
      "READ::SERVICES_TERMS",
    ],
    ORGANIZATION_MANAGEMENT: [
      "READ::LOCATION",
      "UPDATE::LOCATION",
      "READ::EMPLOYEES",
      "UPDATE::SERVICE",
      "CREATE::EMPLOYEES",
      ...addFeature("MASTER_CALENDAR"),
      ...addFeature("APPOINTMENTS"),
      ...addFeature("CUSTOMERS"),
    ],
  },
};

export type UserAccessContext = {
  orgRoles: Record<string, OrgRole[]>; // orgId → roles
  locationRoles: Record<string, LocationRole[]>; // locationId → roles
};

/* ---------- Build Access Context ---------- */
export async function getUserAccessContext(
  userId: string,
): Promise<UserAccessContext> {
  const memberships = await prisma.managementMembership.findMany({
    where: { userId },
    select: { role: true, organizationId: true },
  });

  const locationEmployees = await prisma.locationEmployee.findMany({
    where: { userId },
    select: { role: true, locationId: true },
  });

  // [{organizationId:"1", role: "OWNER"}]
  const orgRoles = memberships.reduce<Record<string, OrgRole[]>>((acc, m) => {
    if (!m.organizationId) return acc;
    if (!acc[m.organizationId]) acc[m.organizationId] = [];
    acc[m.organizationId].push(m.role as OrgRole);
    return acc;
  }, {});

  const locationRoles = locationEmployees.reduce<
    Record<string, LocationRole[]>
  >((acc, le) => {
    if (!acc[le.locationId]) acc[le.locationId] = [];
    acc[le.locationId].push(le.role as LocationRole);
    return acc;
  }, {});

  return {
    orgRoles,
    locationRoles,
  };
}

/* ---------- Pure Access Checker ---------- */
export function canAccess(
  ctx: UserAccessContext,
  required: Permission[],
  target: { organizationId?: string; locationId?: string },
): boolean {
  const { organizationId, locationId } = target;
  // Helper
  const hasPerms = (perms?: Permission[]) =>
    required.every((perm) => perms?.includes(perm));

  let granted: Permission[] = [];

  if (!organizationId) {
    return false;
  }
  // 1️⃣ Org-level (optional for location-only users)
  if (organizationId) {
    const orgRoles = ctx.orgRoles[organizationId];

    if (orgRoles && orgRoles.length > 0) {
      for (const role of orgRoles) {
        granted = granted.concat(ROLE_PERMISSIONS.ORG[role] || []);
      }
    }
  }

  // 2️⃣ Location-level
  if (locationId) {
    const locRoles = ctx.locationRoles[locationId];

    if (!locRoles || locRoles.length === 0) {
      // User isn’t part of this location
      return false;
    }

    for (const role of locRoles) {
      granted = granted.concat(ROLE_PERMISSIONS.LOCATION[role] || []);
    }
  }

  // 3️⃣ Check combined perms
  return hasPerms(granted);
}
