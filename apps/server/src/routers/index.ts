import { protectedProcedure, publicProcedure, router } from "../lib/trpc";
import { adminRouter } from "./admin";
import { authRouter } from "./auth";
import { marketingRouter } from "./marketing";
import { organizationRouter } from "./organization";

export const appRouter = router({
  healthCheck: publicProcedure.query(() => {
    return "OK";
  }),
  admin: adminRouter,
  marketing: marketingRouter,
  auth: authRouter,
  organization: organizationRouter
});
export type AppRouter = typeof appRouter;
