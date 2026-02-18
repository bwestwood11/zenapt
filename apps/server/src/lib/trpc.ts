import { initTRPC, TRPCError } from "@trpc/server";
import type { Context } from "./context";
import superjson from "superjson";
import jwt from "jsonwebtoken";
import type { AdminJWTPayload } from "./types";
import type { CustomerJWTPayload } from "./types";
import { CUSTOMER_ACCESS_COOKIE, verifyCustomerToken } from "./customer-auth";
import {
  canAccess,
  getUserAccessContext,
  type Permission,
} from "./subscription/permissions";
import { ZodObject } from "zod";
import { cache__getOrganizationWithSubscription } from "./helpers/organization";
import { validateSubscription } from "./subscription/subscription";
import prisma from "../../prisma";

export const t = initTRPC
  .context<Context>()
  .meta<{
    requiredPermissions?: Permission | Permission[];
  }>()
  .create({
    transformer: superjson,
  });

export const router = t.router;

export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Authentication required",
      cause: "No session",
    });
  }

  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
    },
  });
});

export const customerProcedure = protectedProcedure.use(
  async ({ ctx, next }) => {
    const customer = ctx.session.user.customer;
    if (!customer) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Customer authentication required",
        cause: "No customer on session",
      });
    }

    return next({
      ctx: {
        ...ctx,
        customer,
      },
    });
  },
);

export const customerJwtProcedure = t.procedure.use(async ({ ctx, next }) => {
  const token = ctx.req?.cookies.get(CUSTOMER_ACCESS_COOKIE)?.value;
  if (!token) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Customer authentication required",
      cause: "No customer_access cookie",
    });
  }

  let payload: CustomerJWTPayload;
  try {
    payload = verifyCustomerToken(token);
  } catch (err) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Invalid or expired customer token",
      cause: err,
    });
  }

  if (payload.type !== "customer") {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Invalid customer token",
      cause: "Unexpected token type",
    });
  }

  let customerAuth;
  try {
    customerAuth = await prisma.customerAuth.findUnique({
      where: { id: payload.sub },
      include: {
        customer: {
          include: { user: true },
        },
      },
    });
  } catch (dbErr) {
    console.error(
      "[customerJwtProcedure] DB lookup failed for customerAuthId:",
      payload.sub,
      dbErr,
    );
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to load customer auth from database",
      cause: dbErr,
    });
  }

  if (!customerAuth) {
    console.error(
      "[customerJwtProcedure] CustomerAuth not found for ID:",
      payload.sub,
    );
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Customer auth record not found",
    });
  }

  if (!customerAuth.customer) {
    console.error(
      "[customerJwtProcedure] Customer not found for customerAuth:",
      payload.sub,
    );
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Customer not found",
    });
  }

  if (!customerAuth.customer.user.emailVerified) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Email verification required",
    });
  }

  return next({
    ctx: {
      ...ctx,
      customerAuth,
      customer: customerAuth.customer,
    },
  });
});

export const adminProcedure = t.procedure.use(({ ctx, next }) => {
  const token = ctx.req?.cookies.get("admin_token")?.value;
  if (!token) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Admin authentication required",
      cause: "No admin_token cookie",
    });
  }
  try {
    const decoded = jwt.verify(
      token,
      process.env.ADMIN_JWT_SECRET as string,
    ) as AdminJWTPayload;
    if (!decoded.admin) {
      throw new Error("Not an admin");
    }
    return next({
      ctx: {
        ...ctx,
        admin: decoded,
      },
    });
  } catch (err) {
    console.log(err);
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Invalid or expired admin token",
      cause: err,
    });
  }
});

export const premiumProcedure = protectedProcedure.use(
  async ({ ctx, next }) => {
    if (!ctx.session.user.organizationId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "No organization associated with user",
        cause: "User has no organizationId",
      });
    }

    const orgWithSub = await cache__getOrganizationWithSubscription(
      ctx.session.user.organizationId,
    );

    if (
      !orgWithSub ||
      !orgWithSub.orgWithSub?.subscription?.stripeSubscriptionId
    ) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "No organization associated with user",
        cause: "User has no organizationId",
      });
    }
    const { isActive } = validateSubscription(
      orgWithSub.orgWithSub?.subscription,
    );
    if (!isActive) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Your subscription is not active",
        cause: "Subscription not active",
      });
    }

    return next({
      ctx: {
        ...ctx,
        orgWithSub: orgWithSub.orgWithSub,
        orgIAT: orgWithSub.iat,
      },
    });
  },
);

export const permissionMiddleware = t.middleware(
  async ({ ctx, meta, input, next }) => {
    const user = ctx.session?.user;
    if (!user || !user.organizationId) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    if (!meta?.requiredPermissions) {
      return next({ ctx: { ...ctx, session: { ...ctx.session, user } } });
    }

    const parsePermission = (p: Permission | Permission[]) => {
      if (typeof p === "string") return [p];

      if (Array.isArray(p)) {
        return p;
      }

      return [];
    };

    const requiredPermissions: Permission[] = parsePermission(
      meta?.requiredPermissions,
    );

    const accessCtx = await getUserAccessContext(user.id);

    const betterInput = input ?? {};
    console.log(betterInput);
    const locationId =
      typeof betterInput === "object" &&
      "locationId" in betterInput &&
      typeof betterInput?.locationId === "string"
        ? betterInput.locationId
        : undefined;

    const ok = canAccess(accessCtx, requiredPermissions, {
      organizationId: user.organizationId,
      locationId,
    });

    if (!ok) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    return next({
      ctx: {
        ...ctx,
        session: {
          ...ctx.session,
          user,
        },
      },
    });
  },
);

export function withPermissions(
  perm: Permission | Permission[],
): typeof premiumProcedure;

export function withPermissions<T extends ZodObject>(
  perm: Permission | Permission[],
  input: T,
): ReturnType<typeof premiumProcedure.input<T>>;

// Implementation
export function withPermissions<T extends ZodObject | undefined>(
  perm: Permission | Permission[],
  input?: T,
) {
  const base = premiumProcedure.meta({
    requiredPermissions: perm,
  });

  return input
    ? base.input(input).use(permissionMiddleware)
    : base.use(permissionMiddleware);
}
