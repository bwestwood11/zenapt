import { unstable_cacheLife, unstable_cacheTag } from "next/cache";
import prisma from "../../../prisma";
import { EmployeeRole, OrgRole } from "@prisma/client";
import { CACHE_KEYS } from "./cache";

type Response =
  | {
      type: "management";
      role: OrgRole;
      organizationId?: string | null;
      locationId: undefined;
    }
  | {
      type: "employee";
      role: EmployeeRole;
      locationId?: string;
      organizationId: undefined;
      locationSlug: string;
    };

type MembershipResponse = {
  management:
    | {
        role: OrgRole;
        organizationId: string;
      }
    | undefined
    | null;
  employees:
    | {
        role: EmployeeRole;
        locationId: string;
        organizationId: string;
        locationSlug: string;
      }[]
    | null;
  customer: {
    id: string;
    phoneNumber: string | null;
    stripeCustomerId: string | null;
  }[] | null;
};

export async function getOrganizationWithSubscription(organizationId: string) {
  const orgWithSub = await prisma.organization.findUnique({
    where: {
      id: organizationId,
    },
    select: {
      subscription: {
        select: {
          stripeSubscriptionId: true,
          status: true,
          currentPeriodEnd: true,
          currentPeriodStart: true,
          maximumLocations: true,
        },
      },
      id: true,
      name: true,
      slug: true,
    },
  });
  return { orgWithSub, iat: new Date() };
}

export const cache__getOrganizationWithSubscription = async (orgId: string) => {
  "use cache";
  unstable_cacheTag(CACHE_KEYS.ORG_WITH_SUBSCRIPTION, orgId);
  unstable_cacheLife({
    expire: 3000,
    revalidate: 900,
    stale: 900,
  });

  const res = await getOrganizationWithSubscription(orgId);

  return res;
};

export async function getOrganizationByUserId(
  userId: string,
): Promise<MembershipResponse | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      management: {
        select: {
          role: true,
          organizationId: true,
        },
      },
      locationEmployees: {
        select: {
          role: true,
          locationId: true,
          location: { select: { organizationId: true, slug: true } }, // because loc → org
        },
      },
      customer: {
        select: {
          id: true,
          phoneNumber: true,
          stripeCustomerId: true,
        },
      },
    },
  });

  if (!user) return { management: null, employees: null, customer: null };

  return {
    management: user.management[0]?.organizationId
      ? {
          role: user.management[0]?.role,
          organizationId: user.management[0]?.organizationId,
        }
      : undefined,
    employees: user.locationEmployees.map((e) => ({
      role: e.role,
      locationId: e.locationId,
      organizationId: e.location.organizationId,
      locationSlug: e.location.slug,
    })),
    customer: user.customer.map((c) => ({
      id: c.id,
      phoneNumber: c.phoneNumber,
      stripeCustomerId: c.stripeCustomerId,
    })) || null,
  };
}
      
