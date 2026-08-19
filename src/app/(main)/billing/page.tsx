import { prisma } from "@/lib/prisma";
import stripe from "@/lib/stripe";
import { getCurrentSession } from "@/features/auth/session";
import { Metadata } from "next";
import Stripe from "stripe";
import GetSubscriptionButton from "./GetSubscriptionButton";
import { formatDate } from "date-fns";
import ManageSubscriptionButton from "./ManageSubscriptionButton";
import DeleteAccountButton from "./DeleteAccountButton";

export const metadata: Metadata = {
  title: "Billing",
};

export default async function Page() {
  const session = await getCurrentSession();

  if (!session) {
    return null;
  }

  const subscription = await prisma.userSubscription.findUnique({
    where: {
      userId: session.user.id,
    },
  });

  const priceInfo = subscription
    ? await stripe.prices.retrieve(subscription.stripePriceId, {
        expand: ["product"],
      })
    : null;

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-3 py-6">
      <h1 className="text-3xl font-bold">Billing</h1>
      <p>
        Your current plan:{" "}
        <span className="font-bold">
          {priceInfo ? (priceInfo.product as Stripe.Product).name : "Free"}
        </span>
      </p>
      {subscription ? (
        <>
          {subscription.stripeCurrentPeriodEnd && (
            <p className="text-destructive">
              Your subscription will be cancelled on{" "}
              {formatDate(subscription.stripeCurrentPeriodEnd, "MMMM dd, yyyy")}
            </p>
          )}
          <ManageSubscriptionButton />
        </>
      ) : (
        <GetSubscriptionButton />
      )}
      <div className="space-y-3 border-t pt-6">
        <div>
          <h2 className="text-lg font-semibold">Danger zone</h2>
          <p className="text-muted-foreground text-sm">
            Permanently delete your account and all your resumes.
          </p>
        </div>
        <DeleteAccountButton />
      </div>
    </main>
  );
}
