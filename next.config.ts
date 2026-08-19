import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
  // Prisma's generator output lives outside node_modules (src/generated/prisma),
  // so Next's default file tracing doesn't know to bundle the query engine
  // binary into serverless functions - without this, Vercel can't find it at
  // runtime even though it built fine locally.
  outputFileTracingIncludes: {
    "/*": ["./src/generated/prisma/**/*"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ifvazkiatwdsj2kr.public.blob.vercel-storage.com",
      },
    ],
  },
};

export default nextConfig;
