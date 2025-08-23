import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const allowedOrigins = (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  const res = NextResponse.next();
  const origin = req.headers.get("origin") || "";
  res.headers.append("Access-Control-Allow-Credentials", "true");
  if (allowedOrigins.includes(origin)) {
    res.headers.set("Access-Control-Allow-Origin", origin);
  }
  res.headers.append("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.headers.append(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );

  return res;
}

export const config = {
  matcher: "/:path*",
};
