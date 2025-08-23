import { initTRPC, TRPCError } from "@trpc/server";
import type { Context } from "./context";
import superjson from "superjson";
import jwt from "jsonwebtoken";
import type { AdminJWTPayload } from "./types";

export const t = initTRPC.context<Context>().create({
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
