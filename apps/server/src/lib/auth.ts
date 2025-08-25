import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from "../../prisma";
import { createAuthMiddleware, APIError } from "better-auth/api";
import { verifyInvitationToken } from "./invitationToken";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  trustedOrigins: (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
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
        console.log(tokenPayload)
        if (!tokenPayload) throw new Error("malformed token");
      } catch (error) {
        throw new APIError("BAD_REQUEST", {
          message: "malformed token",
        });
      }

      return;
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
