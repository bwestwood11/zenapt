import { adminProcedure, publicProcedure, router } from "../lib/trpc";
import { TRPCError } from "@trpc/server";
import jwt from "jsonwebtoken";
import z from "zod";
import prisma from "../../prisma";
import type { AdminJWTPayload } from "../lib/types";
import { cookies } from "next/headers";
import bcrypt from "bcrypt";

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

export const adminRouter = router({
  login: loginAdmin,
  session: sessionAdmin,
});
