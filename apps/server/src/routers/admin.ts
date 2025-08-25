import { adminProcedure, publicProcedure, router } from "../lib/trpc";
import { TRPCError } from "@trpc/server";
import jwt from "jsonwebtoken";
import z from "zod";
import prisma from "../../prisma";
import type { AdminJWTPayload } from "../lib/types";
import { cookies } from "next/headers";
import bcrypt from "bcrypt";
import { createInvitationToken } from "../lib/invitationToken";
import { resend } from "../lib/resend";

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

    if (!admin) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid email or password",
      });
    }

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
  if (!ctx.admin || !ctx.admin.id) {
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
    const token = createInvitationToken({ email: input.email });

    const url = `${process.env.DASHBOARD_URL}/sign-up/email?token=${token}&email=${input.email}`;
    console.log(process.env.NODE_ENV);
    // if (process.env.NODE_ENV !== "development") {
    try {
      const { data, error } = await resend.emails.send({
        from: "Acme <onboarding@resend.dev>",
        to: ["delivered@resend.dev"],
        subject: "Hello world",
        html: `<strong>It works!</strong> <a href="${url}">Sign Up Here</a>`,
      });

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to send invitation email",
          cause: error,
        });
      }

      return "OK";
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to send invitation email",
        cause: error,
      });
    }
    // } else {
    //   console.log(url);
    // }

    return "OK";
  });

export const adminRouter = router({
  login: loginAdmin,
  session: sessionAdmin,
  inviteUser: inviteUser,
});
