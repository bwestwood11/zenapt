import z from "zod";
import { protectedProcedure, publicProcedure, router } from "../lib/trpc";
import { auth } from "../lib/auth";
import prisma from "../../prisma";
import { TRPCError } from "@trpc/server";
import { headers } from "next/headers";

export const authRouter = router({
  signUp: publicProcedure
    .input(
      z.object({
        name: z.string(),
        email: z.string(),
        password: z.string(),
        token: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      await auth.api.signUpEmail({
        body: {
          email: input.email,
          password: input.password,
          name: input.name,
          token: input.token,
        },
      });
      return "OK";
    }),
  changePassword: protectedProcedure
    .input(
      z.object({
        temporaryPassword: z.string(),
        newPassword: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session.user.isTempPassword) {
        throw new TRPCError({
          message: "Try using reset password route to change password.",
          code: "BAD_REQUEST",
        });
      }

      try {
        await auth.api.changePassword({
          body: {
            currentPassword: input.temporaryPassword,
            newPassword: input.newPassword,
            revokeOtherSessions: true,
          },

          headers: await headers(),
        });
        await prisma.user.update({
          data: {
            isTempPassword: false,
          },
          where: {
            id: ctx.session.user.id,
          },
        });

        return "OK";
      } catch (error) {
        console.log(error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
    }),
});
