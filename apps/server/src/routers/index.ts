import { protectedProcedure, publicProcedure, router } from "../lib/trpc";
import { adminRouter } from "./admin";
import { marketingRouter } from "./marketing";

export const appRouter = router({
  healthCheck: publicProcedure.query(() => {
    return "OK";
  }),
  admin: adminRouter,
  marketing: marketingRouter,
});
export type AppRouter = typeof appRouter;
