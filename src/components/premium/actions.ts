"use server";

import { env } from "@/env";
import stripe from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/features/auth/session";
import {
  getUserSubscriptionLevel,
  SubscriptionLevel,
} from "@/lib/subscription";

// Returns the URL to send the user to.
//
// Someone who already has a subscription must never get a second one (they
// would be billed for both), so they never reach a new checkout: Premium ->
// Premium Plus changes their existing subscription in place, and anything else
// sends them to the billing page. This check lives here, on the server, so it
// holds no matter what the client asks for.
export async function createCheckoutSession(priceId: string) {
  const session = await getCurrentSession();

  if (!session) {
    throw new Error("Unauthorized");
  }

  const subscriptionLevel = await getUserSubscriptionLevel(session.user.id);

  if (subscriptionLevel !== "free") {
    return changeExistingSubscription(
      session.user.id,
      subscriptionLevel,
      priceId,
    );
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

async function changeExistingSubscription(
  userId: string,
  currentLevel: Exclude<SubscriptionLevel, "free">,
  priceId: string,
) {
  const isUpgrade =
    currentLevel === "pro" &&
    priceId === env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO_PLUS_MONTHLY;

  // Same plan again, or a downgrade: nothing to buy. The billing page is
  // where they manage the plan they have.
  if (!isUpgrade) {
    return `${env.NEXT_PUBLIC_BASE_URL}/billing`;
  }

  const subscription = await prisma.userSubscription.findUniqueOrThrow({
    where: { userId },
  });

  const stripeSubscription = await stripe.subscriptions.retrieve(
    subscription.stripeSubscriptionId,
  );

  // Swap the price on the subscription they already have and charge the
  // prorated difference right away. If that payment can't be collected the
  // update fails and the subscription stays exactly as it was, instead of
  // being left half-upgraded.
  const updated = await stripe.subscriptions.update(
    subscription.stripeSubscriptionId,
    {
      items: [{ id: stripeSubscription.items.data[0].id, price: priceId }],
      proration_behavior: "always_invoice",
      payment_behavior: "error_if_incomplete",
    },
  );

  // Stripe's webhook will write the same values, but not necessarily before
  // the user lands on the success page, so don't wait for it.
  await prisma.userSubscription.update({
    where: { userId },
    data: {
      stripePriceId: priceId,
      stripeCurrentPeriodEnd: new Date(
        updated.items.data[0].current_period_end * 1000,
      ),
    },
  });

  return `${env.NEXT_PUBLIC_BASE_URL}/billing/success`;
}
