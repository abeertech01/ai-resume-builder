"use server";

import { env } from "@/env";
import stripe from "@/lib/stripe";
import { getCurrentSession } from "@/features/auth/session";

export async function createCustomerPortalSession() {
  const session = await getCurrentSession();

  if (!session) {
    throw new Error("Unauthorized");
  }

  const stripeCustomerId = session.user.stripeCustomerId;

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
