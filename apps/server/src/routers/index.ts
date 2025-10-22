import { protectedProcedure, router } from "../lib/trpc";
import { adminRouter } from "./admin";
import { authRouter } from "./auth";
import { invitationRouter } from "./invitations";
import { locationRouter } from "./location";
import { logsRouter } from "./logs";
import { marketingRouter } from "./marketing";
import { organizationRouter } from "./organization";
import { paymentRouter } from "./payments";
import { permissionRouter } from "./permissions";
import { servicesRouter } from "./services";

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
  invitation: invitationRouter,
  services: servicesRouter,
  logs: logsRouter
});

export type AppRouter = typeof appRouter;
