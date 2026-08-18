"use server";

import { prisma } from "@/lib/prisma";
import {
  logInSchema,
  LogInValues,
  signUpSchema,
  SignUpValues,
} from "@/lib/validation";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { dummyPasswordHash, hashPassword, verifyPassword } from "./password";
import { checkRateLimit, getClientIp } from "./rateLimit";
import {
  clearSessionCookie,
  createSession,
  invalidateSessionToken,
  SESSION_COOKIE_NAME,
  setSessionCookie,
} from "./session";

export type AuthActionResult = { error: string };

export async function signUp(
  values: SignUpValues,
): Promise<AuthActionResult> {
  const { firstName, lastName, email, password } = signUpSchema.parse(values);

  const ip = await getClientIp();
  const allowed = await checkRateLimit(`signup:${ip}`, {
    maxAttempts: 5,
    windowMs: 60 * 60 * 1000,
  });

  if (!allowed) {
    return { error: "Too many signup attempts. Please try again later." };
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingUser) {
    return { error: "An account with this email already exists." };
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: { email, passwordHash, firstName, lastName },
  });

  const { token, expiresAt } = await createSession(user.id);
  await setSessionCookie(token, expiresAt);

  redirect("/resumes");
}

export async function logIn(values: LogInValues): Promise<AuthActionResult> {
  const { email, password } = logInSchema.parse(values);

  const allowed = await checkRateLimit(`login:${email.toLowerCase()}`, {
    maxAttempts: 5,
    windowMs: 5 * 60 * 1000,
  });

  if (!allowed) {
    return {
      error: "Too many login attempts. Please try again in a few minutes.",
    };
  }

  const user = await prisma.user.findUnique({ where: { email } });

  const validPassword = await verifyPassword(
    user?.passwordHash ?? (await dummyPasswordHash),
    password,
  );

  if (!user || !validPassword) {
    return { error: "Invalid email or password." };
  }

  const { token, expiresAt } = await createSession(user.id);
  await setSessionCookie(token, expiresAt);

  redirect("/resumes");
}

export async function logOut() {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (token) await invalidateSessionToken(token);
  await clearSessionCookie();
  redirect("/");
}
