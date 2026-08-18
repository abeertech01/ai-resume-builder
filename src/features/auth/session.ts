import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import type { User } from "@/generated/prisma";
import { SESSION_COOKIE_NAME } from "./constants";

export { SESSION_COOKIE_NAME };

const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30; // 30 days
const SESSION_RENEWAL_WINDOW_MS = 1000 * 60 * 60 * 24 * 15; // renew once under 15 days left

function generateSessionToken() {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString("base64url");
}

// The raw token lives only in the user's cookie. We store just its hash, so a
// database leak can't be replayed as a live session.
async function hashSessionToken(token: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token),
  );
  return Buffer.from(digest).toString("hex");
}

export async function createSession(userId: string) {
  const token = generateSessionToken();
  const id = await hashSessionToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await prisma.session.create({ data: { id, userId, expiresAt } });

  return { token, expiresAt };
}

export async function validateSessionToken(
  token: string,
): Promise<{ user: User; expiresAt: Date } | null> {
  const id = await hashSessionToken(token);

  const session = await prisma.session.findUnique({
    where: { id },
    include: { user: true },
  });

  if (!session) return null;

  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id } });
    return null;
  }

  let expiresAt = session.expiresAt;
  if (expiresAt.getTime() - Date.now() < SESSION_RENEWAL_WINDOW_MS) {
    expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
    await prisma.session.update({ where: { id }, data: { expiresAt } });
  }

  return { user: session.user, expiresAt };
}

export async function invalidateSessionToken(token: string) {
  const id = await hashSessionToken(token);
  await prisma.session.delete({ where: { id } }).catch(() => {});
}

export async function invalidateAllUserSessions(userId: string) {
  await prisma.session.deleteMany({ where: { userId } });
}

export async function setSessionCookie(token: string, expiresAt: Date) {
  (await cookies()).set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });
}

export async function clearSessionCookie() {
  (await cookies()).delete(SESSION_COOKIE_NAME);
}

// Cached per-request: every currentUser()/auth() call in a single render
// shares one DB lookup instead of hitting the Session table repeatedly.
export const getCurrentSession = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return validateSessionToken(token);
});
