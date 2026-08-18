"use server";

import { env } from "@/env";
import { prisma } from "@/lib/prisma";
import stripe from "@/lib/stripe";
import { getCurrentSession } from "@/features/auth/session";

export async function createCustomerPortalSession() {
  const session = await getCurrentSession();

  if (!session) {
    throw new Error("Unauthorized");
  }

  // This action is only ever called when a subscription already exists (see
  // billing/page.tsx), so read its stripeCustomerId directly rather than
  // User.stripeCustomerId - that field is set by the checkout.session.completed
  // webhook, which is a separate, less reliable path than the
  // subscription-created webhook that populated this record.
  const subscription = await prisma.userSubscription.findUnique({
    where: { userId: session.user.id },
  });

  const stripeCustomerId =
    subscription?.stripeCustomerId ?? session.user.stripeCustomerId;

  if (!stripeCustomerId) {
    throw new Error("Stripe customer ID not found");
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: `${env.NEXT_PUBLIC_BASE_URL}/billing`,
  });

  if (!portalSession.url) {
    throw new Error("Failed to create billing portal session");
  }

  return portalSession.url;
}
