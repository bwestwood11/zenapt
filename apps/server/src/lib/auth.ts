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
        console.log(tokenPayload);
        if (!tokenPayload) throw new Error("malformed token");
      } catch (error) {
        throw new APIError("BAD_REQUEST", {
          message: "malformed token",
        });
      }

      return;
    }),
    after: createAuthMiddleware(async (ctx) => {
      //TODO: manage other sign up roles as well not just owner
      if (ctx.path.startsWith("/sign-up/")) {
        const newSession = ctx.context.session;
        if (newSession) {
          await prisma.managementMembership.create({
            data: {
              userId: newSession.user.id,
              role: "OWNER",
            },
          });
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
    },
  },
});
