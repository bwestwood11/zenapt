import { EmployeeRole, OrgRole } from "../../prisma/generated/enums";
import {
  createSignedToken,
  createTokenWithTTL,
  verifySignedToken,
} from "./helpers/hash";

export enum INVITATION_TYPE {
  MANAGEMENT = "MANAGEMENT",
  LOCATION = "LOCATION",
}

type Payload<T extends Record<string, string>> = (
  | {
      email: string;
      name?: string;
      type: INVITATION_TYPE.MANAGEMENT;
      role: OrgRole;
      organizationId?: string;
    }
  | {
      email: string;
      name?: string;
      type: INVITATION_TYPE.LOCATION;
      role: EmployeeRole;
      locationId: string;
    }
) &
  T;

/**
 * Create a secure HMAC token (JWT style)
 */
export function createInvitationToken<T extends Record<string, string>>(
  user: Payload<T>,
  ttlInSeconds: number
): string {
  const sig = createTokenWithTTL<Payload<T>>(user, ttlInSeconds);
  return `${user.role}_${sig}`;
}

/**
 * Verify token integrity and expiry
 */
export function verifyInvitationToken<T extends Record<string, string>>(
  token: string
): { data: Payload<T> | undefined; exp?: number } {
  const actualToken = token.split("_").pop();
  if (!actualToken) {
    throw new Error("Token is malformed");
  }

  return verifySignedToken<Payload<T>>(actualToken);
}
