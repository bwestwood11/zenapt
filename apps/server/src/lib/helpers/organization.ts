import prisma from "../../../prisma";
import { EmployeeRole, OrgRole } from "../../../prisma/generated/enums";

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
    };

export async function getOrganizationByUserId(
  userId: string
): Promise<Response | null> {
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
    },
    select: {
      management: true,
      locationEmployees: true,
    },
  });

  if (!user) return null;
  if (user.management.length) {
    return {
      role: user.management[0].role,
      organizationId: user.management[0].organizationId,
      locationId: undefined,
      type: "management",
    };
  }
  if (user.locationEmployees.length) {
    return {
      role: user.locationEmployees[0].role,
      locationId: user.locationEmployees[0].locationId,
      organizationId: undefined,
      type: "employee",
    };
  }
  return null;
}
