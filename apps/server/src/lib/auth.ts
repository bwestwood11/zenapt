import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from "../../prisma";
import { createAuthMiddleware, APIError } from "better-auth/api";
import { verifyInvitationToken } from "./invitationToken";
import { nextCookies } from "better-auth/next-js";
import { customSession } from "better-auth/plugins";
import { getOrganizationByUserId } from "./helpers/organization";

export const auth = betterAuth({
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

      return {
        user: {
          ...user,
          ...roles,
          organizationId,
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
      if (!token) {
        throw new APIError("BAD_REQUEST", {
          message: "Token is request for signup endpoint.",
        });
      }

      try {
        const tokenPayload = verifyInvitationToken(token);

        if (!tokenPayload) throw new Error("malformed token");
      } catch (error) {
        throw new APIError("BAD_REQUEST", {
          message: "malformed token",
        });
      }

      return { context: ctx };
    }),
    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path.startsWith("/sign-up/email")) {
        const newSession = ctx.context.newSession;
        if (newSession) {
          try {
            const tokenPayload = verifyInvitationToken(newSession.user.token);

            if (!tokenPayload || !tokenPayload.data) {
              throw new APIError("BAD_REQUEST", {
                message: "token is invalid in after hook better auth",
              });
            }

            if (tokenPayload.data.type === "MANAGEMENT") {
              await prisma.managementMembership.create({
                data: {
                  userId: newSession.user.id,
                  role: tokenPayload.data.role,
                  organizationId: tokenPayload.data.organizationId,
                },
              });
            } else {
              await prisma.locationEmployee.create({
                data: {
                  userId: newSession.user.id,
                  role: tokenPayload.data.role,
                  locationId: tokenPayload.data.locationId,
                },
              });
            }
          } catch (error) {
            console.log(error);
            throw new APIError("BAD_REQUEST", {
              message: "token is invalid in after hook better auth",
            });
          }
        }
      }
    }),
  },
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      token: {
        type: "string",
        required: true,
      },
      isTempPassword: {
        type: "boolean",
        defaultValue: false,
      },
    },
  },
});
