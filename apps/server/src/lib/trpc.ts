import { initTRPC, TRPCError } from "@trpc/server";
import type { Context } from "./context";
import superjson from "superjson";
import jwt from "jsonwebtoken";
import type { AdminJWTPayload } from "./types";
import {
  canAccess,
  getUserAccessContext,
  type Permission,
} from "./subscription/permissions";
import { ZodObject } from "zod";

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
      process.env.ADMIN_JWT_SECRET as string
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
      meta?.requiredPermissions
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
  }
);

export function withPermissions(
  perm: Permission | Permission[]
): typeof protectedProcedure;

export function withPermissions<T extends ZodObject>(
  perm: Permission | Permission[],
  input: T
): ReturnType<typeof protectedProcedure.input<T>>;

// Implementation
export function withPermissions<T extends ZodObject | undefined>(
  perm: Permission | Permission[],
  input?: T
) {
  const base = protectedProcedure.meta({
    requiredPermissions: perm,
  });

  return input ? base.input(input).use(permissionMiddleware) : base.use(permissionMiddleware);
}
