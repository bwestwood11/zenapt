import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    useCache: true,
  },
  outputFileTracingIncludes: {
    "/*": ["./prisma/generated/**/*"],
  },
  typescript: {
    ignoreBuildErrors: true,
  }
};

export default nextConfig;
