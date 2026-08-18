import "server-only";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

interface RateLimitOptions {
  maxAttempts: number;
  windowMs: number;
}

// Returns false once `key` has hit maxAttempts within windowMs, true
// otherwise (and records this attempt). Backed by Postgres rather than an
// in-memory counter: Vercel runs this app as multiple separate serverless
// instances with no shared memory between them, so a plain in-process
// counter wouldn't actually be shared across concurrent requests.
export async function checkRateLimit(key: string, options: RateLimitOptions) {
  const windowStart = new Date(Date.now() - options.windowMs);

  await prisma.rateLimitAttempt.deleteMany({
    where: { key, createdAt: { lt: windowStart } },
  });

  const attemptCount = await prisma.rateLimitAttempt.count({
    where: { key, createdAt: { gte: windowStart } },
  });

  if (attemptCount >= options.maxAttempts) {
    return false;
  }

  await prisma.rateLimitAttempt.create({ data: { key } });
  return true;
}

export async function getClientIp() {
  const headersList = await headers();
  const forwardedFor = headersList.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return headersList.get("x-real-ip") ?? "unknown";
}
