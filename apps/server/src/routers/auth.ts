import z from "zod";
import { publicProcedure, router } from "../lib/trpc";
import { auth } from "../lib/auth";

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
});
