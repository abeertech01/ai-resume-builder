"use server";

import { env } from "@/env";
import stripe from "@/lib/stripe";
import { getCurrentSession } from "@/features/auth/session";

export async function createCheckoutSession(priceId: string) {
  const session = await getCurrentSession();

  if (!session) {
    throw new Error("Unauthorized");
  }

  const stripeCustomerId = session.user.stripeCustomerId ?? undefined;

  const checkoutSession = await stripe.checkout.sessions.create({
    line_items: [{ price: priceId, quantity: 1 }],
    mode: "subscription",
    success_url: `${env.NEXT_PUBLIC_BASE_URL}/billing/success`,
    cancel_url: `${env.NEXT_PUBLIC_BASE_URL}/billing`,
    customer: stripeCustomerId,
    customer_email: stripeCustomerId ? undefined : session.user.email,
    metadata: {
      userId: session.user.id,
    },
    subscription_data: {
      metadata: {
        userId: session.user.id,
      },
    },
    custom_text: {
      terms_of_service_acceptance: {
        message: `I have read AI Resume Builder's [terms of service](${env.NEXT_PUBLIC_BASE_URL}/tos) and agree to them.`,
      },
    },
    consent_collection: {
      terms_of_service: "required",
    },
  });

  if (!checkoutSession.url) {
    throw new Error("Failed to create checkout session");
  }

  return checkoutSession.url;
}
