import { protectedProcedure, publicProcedure, router } from "../lib/trpc";
import { adminRouter } from "./admin";
import { authRouter } from "./auth";
import { invitationRouter } from "./invitations";
import { locationRouter } from "./location";
import { marketingRouter } from "./marketing";
import { organizationRouter } from "./organization";
import { paymentRouter } from "./payments";
import { permissionRouter } from "./permissions";

export const appRouter = router({
  healthCheck: protectedProcedure.query(() => {
    return "OK";
  }),
  admin: adminRouter,
  marketing: marketingRouter,
  auth: authRouter,
  organization: organizationRouter,
  payments: paymentRouter,
  permissions: permissionRouter,
  location: locationRouter,
  invitation: invitationRouter
});
export type AppRouter = typeof appRouter;
