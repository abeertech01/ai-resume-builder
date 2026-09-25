import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/features/auth/session";
import {
  getUserSubscriptionLevel,
  SubscriptionLevel,
} from "@/lib/subscription";
import { cn } from "@/lib/utils";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import GetSubscriptionButton from "./GetSubscriptionButton";
import { formatDate } from "date-fns";
import ManageSubscriptionButton from "./ManageSubscriptionButton";

export const metadata: Metadata = {
  title: "Billing",
};

// The same names the premium modal uses, rather than the Stripe product name.
const planNames: Record<SubscriptionLevel, string> = {
  free: "Free",
  pro: "Premium",
  pro_plus: "Premium Plus",
};

export default async function Page() {
  const session = await getCurrentSession();

  // The (main) layout no longer gates this centrally, since it allows
  // anonymous access to /editor — this page still requires an account.
  if (!session) {
    redirect("/sign-in");
  }

  const subscription = await prisma.userSubscription.findUnique({
    where: {
      userId: session.user.id,
    },
  });

  const subscriptionLevel = await getUserSubscriptionLevel(session.user.id);

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-3 py-6">
      <h1 className="font-heading text-3xl font-bold">Billing</h1>
      <p>
        Your current plan:{" "}
        <span
          className={cn(
            "font-bold",
            subscriptionLevel !== "free" && "text-sky-600 dark:text-sky-400",
          )}
        >
          {planNames[subscriptionLevel]}
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
    </main>
  );
}
