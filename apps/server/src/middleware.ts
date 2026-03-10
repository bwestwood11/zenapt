import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const allowedOrigins = (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (allowedOrigins.length === 0 && process.env.NODE_ENV !== "production") {
    allowedOrigins.push("http://localhost:3000", "http://127.0.0.1:3000");
  }

  const res =
    req.method === "OPTIONS"
      ? new NextResponse(null, { status: 204 })
      : NextResponse.next();

  const origin = req.headers.get("origin") || "";

  if (!origin) {
    return res;
  }

  res.headers.set("Vary", "Origin, Access-Control-Request-Headers");

  if (allowedOrigins.includes(origin)) {
    res.headers.set("Access-Control-Allow-Credentials", "true");
    res.headers.set("Access-Control-Allow-Origin", origin);
  } else if (req.method === "OPTIONS") {
    return new NextResponse(null, { status: 403 });
  }

  res.headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.headers.set("Access-Control-Max-Age", "86400");

  const requestedHeaders = req.headers.get("access-control-request-headers");
  res.headers.set(
    "Access-Control-Allow-Headers",
    requestedHeaders ||
      "content-type, authorization, x-location-id, x-location-slug",
  );

  if (req.method === "OPTIONS") {
    return res;
  }

  return res;
}

export const config = {
  matcher: ["/trpc/:path*", "/api/:path*"],
};
