"use server";

import { prisma } from "@/lib/prisma";
import stripe from "@/lib/stripe";
import { del } from "@vercel/blob";
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
  getCurrentSession,
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

export async function deleteAccount(
  password: string,
): Promise<AuthActionResult> {
  const session = await getCurrentSession();

  if (!session) {
    throw new Error("Unauthorized");
  }

  const validPassword = await verifyPassword(
    session.user.passwordHash,
    password,
  );

  if (!validPassword) {
    return { error: "Incorrect password." };
  }

  const subscription = await prisma.userSubscription.findUnique({
    where: { userId: session.user.id },
  });

  // Cancel any active Stripe subscription first, so deleting the account
  // doesn't leave them being billed for a plan tied to a user that no
  // longer exists.
  if (subscription) {
    await stripe.subscriptions
      .cancel(subscription.stripeSubscriptionId)
      .catch(() => {});
  }

  // DB cascade deletes (below) don't touch external Blob storage, so any
  // uploaded resume photos need to be removed explicitly.
  const resumes = await prisma.resume.findMany({
    where: { userId: session.user.id },
    select: { photoUrl: true },
  });

  await Promise.all(
    resumes
      .filter((resume) => resume.photoUrl)
      .map((resume) => del(resume.photoUrl!).catch(() => {})),
  );

  // Cascades to Resume (and its WorkExperience/Education), UserSubscription,
  // and Session via onDelete: Cascade in the schema.
  await prisma.user.delete({ where: { id: session.user.id } });

  await clearSessionCookie();
  redirect("/");
}
