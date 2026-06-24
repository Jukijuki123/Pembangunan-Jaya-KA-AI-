import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // bcryptjs is pure JS, but mark prisma as external to avoid bundling issues on serverless
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
  eslint: {
    // Lint is run separately in CI; do not fail the production build on lint warnings.
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
