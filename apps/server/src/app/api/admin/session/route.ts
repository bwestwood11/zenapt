import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import type { AdminJWTPayload } from "../../../../lib/types";

export async function GET(req: NextRequest) {
  const token = req?.cookies.get("admin_token")?.value;
  if (!token) {
    return NextResponse.json({ message: "No Token" }, { status: 500 });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.ADMIN_JWT_SECRET as string
    ) as AdminJWTPayload;

    if (!decoded.admin) {
      return NextResponse.json({ message: "Not Authorized" }, { status: 401 });
    }

    return NextResponse.json({ data: decoded }, { status: 200 });
  } catch (err) {
    console.log(err);
    return NextResponse.json(
      { message: "Something Went Wrong" },
      { status: 500 }
    );
  }
}
