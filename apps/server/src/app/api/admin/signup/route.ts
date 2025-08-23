import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import prisma from "../../../../../prisma";
import z from "zod";

const ADMIN_JWT_TOKEN = process.env.ADMIN_JWT_TOKEN;
const MAX_ADMINS = 2;
const SALT_ROUNDS = 10;

const bodySchema = z.object({
  email: z.email(),
  password: z.string().min(3).max(150),
  name: z.string().min(3).max(150),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!ADMIN_JWT_TOKEN)
      return NextResponse.json(
        { message: "Something Went Wrong" },
        { status: 500 }
      );

    const secret = req.headers.get("Authorization");
    if (!secret)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    if (secret != `Bearer ${ADMIN_JWT_TOKEN}`) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const adminsCount = await prisma.admin.count();
    if (adminsCount >= MAX_ADMINS) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { success, data, error } = bodySchema.safeParse(body);
    if (!success) {
      console.error(error);
      return NextResponse.json({ message: "Invalid Body" }, { status: 400 });
    }

    const salt = bcrypt.genSaltSync(SALT_ROUNDS);
    const hashedPassword = bcrypt.hashSync(data.password, salt);

    await prisma.admin.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
      },
    });
    return NextResponse.json({ message: "Success" }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Something Went Wrong" },
      { status: 500 }
    );
  }
}
