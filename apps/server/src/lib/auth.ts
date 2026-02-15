import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from "../../prisma";
import { createAuthMiddleware, APIError } from "better-auth/api";
import { verifyInvitationToken } from "./invitationToken";
import { nextCookies } from "better-auth/next-js";
import { customSession } from "better-auth/plugins";
import { getOrganizationByUserId } from "./helpers/organization";

export const auth = betterAuth({
  user: {
    additionalFields: {
      token: {
        type: "string",
        required: false,
      },
      isTempPassword: {
        type: "boolean",
        defaultValue: false,
        returned: true,
      },
    },
  },

  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  trustedOrigins: (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
  plugins: [
    nextCookies(),
    customSession(async ({ user, session }) => {
      const roles = await getOrganizationByUserId(user.id);
      const organizationId =
        roles?.management?.organizationId ||
        roles?.employees?.[0]?.organizationId;

      const isTempPassword =
        "isTempPassword" in user ? (user.isTempPassword as boolean) : false;
      const token = "token" in user ? (user.token as string) : undefined;

      return {
        user: {
          ...user,
          ...roles,
          organizationId,
          isTempPassword,
          token,
        },
        session,
      };
    }),
  ],
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-up/email") {
        return;
      }

      // Signup Route
      console.log(ctx.body.token);
      const token = ctx.body.token;
      console.log("Signup token:", token);
      // If token is provided, verify it (for employee/management signup)
      if (token) {
        try {
          const tokenPayload = verifyInvitationToken(token);

          if (!tokenPayload) throw new Error("malformed token");
        } catch (error) {
          throw new APIError("BAD_REQUEST", {
            message: "malformed token",
          });
        }
      }
      // If no token, allow signup (for customer registration)

      return { context: ctx };
    }),
    after: createAuthMiddleware(async (ctx) => {
      // Only process after email verification
      if (!ctx.path.startsWith("/verify-email")) {
        return;
      }

      const newSession = ctx.context.newSession;
      if (!newSession?.user?.emailVerified) {
        return;
      }

      const userId = newSession.user.id;
      const userToken = newSession.user.token;

      try {
        // If user has a token, create employee/management record
        if (userToken) {
          const tokenPayload = verifyInvitationToken(userToken);

          if (!tokenPayload?.data) {
            throw new APIError("BAD_REQUEST", {
              message: "Invalid invitation token",
            });
          }

          if (tokenPayload.data.type === "MANAGEMENT") {
            // Check if management membership already exists
            const existing = await prisma.managementMembership.findFirst({
              where: { userId },
            });

            if (!existing) {
              await prisma.managementMembership.create({
                data: {
                  userId,
                  role: tokenPayload.data.role,
                  organizationId: tokenPayload.data.organizationId,
                },
              });
            }
          } else {
            // Check if employee already exists for this location
            const existing = await prisma.locationEmployee.findFirst({
              where: {
                userId,
                locationId: tokenPayload.data.locationId,
              },
            });

            if (!existing) {
              await prisma.locationEmployee.create({
                data: {
                  userId,
                  role: tokenPayload.data.role,
                  locationId: tokenPayload.data.locationId,
                },
              });
            }
          }
        } else {
          throw new APIError("BAD_REQUEST", {
            message: "No invitation token provided",
          });
        }
      } catch (error) {
        console.error("Error creating user record:", error);
        throw new APIError("BAD_REQUEST", {
          message:
            error instanceof APIError
              ? error.message
              : "Failed to create user account",
        });
      }
    }),
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      // Implement your email sending logic here
      console.log(`Send verification email to ${user.email} with link: ${url}`);
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },
});
