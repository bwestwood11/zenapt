import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    useCache: true,
  },
  serverExternalPackages: ["@prisma/client", "prisma"],
  outputFileTracingIncludes: {
    "/*": [
      "./node_modules/.prisma/client/**/*",
      "../../node_modules/.prisma/client/**/*",
    ],
  },
  typescript: {
    ignoreBuildErrors: true,
  }
};

export default nextConfig;
