import { adminProcedure, publicProcedure, router } from "../lib/trpc";
import { TRPCError } from "@trpc/server";
import jwt from "jsonwebtoken";
import z from "zod";
import prisma from "../../prisma";
import type { AdminJWTPayload } from "../lib/types";
import { cookies } from "next/headers";
import bcrypt from "bcrypt";
import { createInvitationToken, INVITATION_TYPE } from "../lib/invitationToken";
import { sesEmailService } from "../lib/email/ses";
import { toSeconds } from "../lib/helpers/utils";
import { OrgRole } from "@prisma/client";

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET!;

const loginAdmin = publicProcedure
  .input(
    z.object({
      email: z.email("Please enter a valid email address"),
      password: z.string().min(6, "Password must be at least 6 characters"),
    })
  )
  .mutation(async ({ input }) => {
    const { email, password } = input;
    // Validate admin credentials (this is a placeholder, implement your own logic)
    const admin = await prisma.admin.findUnique({
      where: { email },
    });
    console.log(password);
    if (!admin) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid email or password",
      });
    }
    console.log(admin);

    const isPasswordValid = bcrypt.compareSync(password, admin.password);
    if (!isPasswordValid) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid email or password",
      });
    }
    
    // Prepare JWT payload
    const data: AdminJWTPayload = {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      admin: true,
    };

    // Generate JWT
    const token = jwt.sign(data, ADMIN_JWT_SECRET, { expiresIn: "1h" });
    // Set cookie in the response
    const cookieOptions = await cookies();
    cookieOptions.set("admin_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60, // 1 hour
    });
    // Return admin data (excluding password) and token
    return {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      token,
    };
  });

const sessionAdmin = adminProcedure.query(async ({ ctx }) => {
  if (!ctx.admin?.id) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Not authenticated",
    });
  }
  return ctx.admin;
});

const inviteUser = adminProcedure
  .input(z.object({ email: z.email() }))
  .mutation(async ({ ctx, input }) => {
    const token = createInvitationToken(
      {
        email: input.email,
        type: INVITATION_TYPE.MANAGEMENT,
        role: OrgRole.OWNER,
      },
      toSeconds({ days: 7 })
    );

    const url = `${process.env.DASHBOARD_URL}/sign-up/owner?token=${token}&email=${input.email}`;

    if(process.env.NODE_ENV === "development"){
      console.log("Invitation URL:", url);
      return "OK (Development Mode - Check Console)";
    }

    try {
      await sesEmailService.send({
        from: `Acme <${process.env.FROM_EMAIL || "support@zenapt.studio"}>`,
        to: input.email,
        subject: "Hello world",
        html: `<strong>It works!</strong> <a href="${url}">Sign Up Here</a>`,
      });

      return "OK";
    } catch (error) {
      console.error("Failed to send invitation email:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to send invitation email",
        cause: error,
      });
    }
  });

const getDemosRequest = adminProcedure
  .input(
    z.object({
      limit: z.number().min(1).max(50).default(10),
      cursor: z.string().nullish(),
      direction: z.enum(["forward", "backward"]).default("forward"),
    })
  )
  .query(async ({ ctx, input }) => {
    if (!ctx.admin?.id) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Not authenticated",
      });
    }

    const { limit, cursor, direction } = input;

    const take = direction === "forward" ? limit + 1 : -(limit + 1);

    const demos = await prisma.demoRequest.findMany({
      take,
      skip: cursor ? 1 : 0,
      ...(cursor && { cursor: { id: cursor } }),
      orderBy: { createdAt: "desc" },
    });

    let nextCursor: string | null = null;
    let prevCursor: string | null = null;

    if (demos.length > limit) {
      if (direction === "forward") {
        const nextItem = demos.pop();
        nextCursor = nextItem?.id ?? null;
      } else {
        demos.shift();
        prevCursor = demos[0]?.id ?? null;
      }
    }

    return {
      data: demos,
      nextCursor,
      prevCursor,
      hasNextPage: !!nextCursor,
      hasPrevPage: !!prevCursor,
    };
  });

export const adminRouter = router({
  login: loginAdmin,
  session: sessionAdmin,
  inviteUser: inviteUser,
  getDemosRequest: getDemosRequest,
});
