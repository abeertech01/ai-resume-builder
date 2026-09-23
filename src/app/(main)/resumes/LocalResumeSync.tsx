"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { clearLocalResume, readLocalResume } from "@/lib/localResume";
import { ResumeValues } from "@/lib/validation";
import { SubscriptionLevel } from "@/lib/subscription";
import { saveResume } from "../editor/actions";
import { createCheckoutSession } from "@/components/premium/actions";
import { env } from "@/env";

interface LocalResumeSyncProps {
  subscriptionLevel: SubscriptionLevel;
  canImport: boolean;
  existingResumes: { id: string; title: string | null }[];
}

// Rendered on /resumes — the page every login/signup redirects to — to
// reconcile whatever free-tier resume the user built anonymously in this
// browser with their account.
//
// - pro_plus never lands here at all: it's always unlimited, so canImport
//   is always true and the import below is silent.
// - free/pro with room left under their plan: also silent, same as above.
// - free/pro already at their resume cap: shown three choices instead of
//   silently doing anything — upgrade (to make room and keep both),
//   replace an existing resume, or leave the local copy alone and decide
//   later.
export default function LocalResumeSync({
  subscriptionLevel,
  canImport,
  existingResumes,
}: LocalResumeSyncProps) {
  const router = useRouter();
  const [localResume, setLocalResume] = useState<ResumeValues | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [isWorking, setIsWorking] = useState(false);

  // React's Strict Mode double-invokes effects on mount in dev, which
  // would otherwise fire two concurrent import attempts: the first
  // succeeds and the second then fails against the now-updated resume
  // count ("Maximum resume count reached"). This guard makes sure only
  // one attempt ever actually runs.
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;

    const stored = readLocalResume();
    if (!stored) return;

    if (canImport) {
      importResume(stored, undefined);
    } else {
      setLocalResume(stored);
    }
    // Only ever run once, right after this page mounts post-authentication.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function importResume(values: ResumeValues, id: string | undefined) {
    setIsWorking(true);
    try {
      const photo =
        typeof values.photo === "string" && values.photo.startsWith("data:")
          ? await dataUrlToFile(values.photo)
          : undefined;

      await saveResume({ ...values, id, photo });
      clearLocalResume();
      setLocalResume(null);
      // /resumes is a server component — its resume list, count, and
      // "can create" state were all fetched before this import ran, so
      // without this the page would keep showing the stale list until
      // the user manually reloaded.
      router.refresh();
      toast.success(
        id
          ? "Your saved resume was replaced with the one you built earlier."
          : "The resume you built before signing in has been saved to your account.",
      );
    } catch (error) {
      console.error("Failed to sync local resume", error);
      toast.error("Couldn't save your in-progress resume.", {
        description: "Please try again.",
      });
    } finally {
      setIsWorking(false);
    }
  }

  async function upgrade(priceId: string) {
    setIsWorking(true);
    try {
      const url = await createCheckoutSession(priceId);
      window.location.href = url;
      // Deliberately not clearing localStorage or setIsWorking(false) here:
      // the browser is about to navigate to Stripe. If they come back
      // without completing checkout, this card should still be exactly
      // as they left it.
    } catch (error) {
      console.error("Failed to start checkout", error);
      toast.error("Something went wrong. Please try again later.");
      setIsWorking(false);
    }
  }

  if (!localResume || canImport || dismissed) return null;

  // "Last" = least recently updated, since existingResumes is fetched
  // ordered by updatedAt desc. Free tier only ever has one resume at its
  // cap, so this is unambiguous there; for pro (cap of 3), this picks
  // whichever of the three the account has touched least recently.
  const replaceTarget = existingResumes[existingResumes.length - 1];
  const replaceTargetName = replaceTarget.title || "Untitled";

  return (
    <Card>
      <CardHeader>
        <CardTitle>You have an in-progress resume</CardTitle>
        <CardDescription>
          You built a resume in this browser before signing in, but your{" "}
          {subscriptionLevel} plan is already at its resume limit.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-muted-foreground text-sm">
        Upgrade to make room and keep both, replace{" "}
        {subscriptionLevel === "pro"
          ? "your least recently updated resume"
          : "your existing resume"}{" "}
        (&quot;{replaceTargetName}&quot;) with it, or leave it saved in this
        browser and decide later.
      </CardContent>
      <CardFooter className="flex flex-wrap gap-3">
        {subscriptionLevel === "free" && (
          <Button
            disabled={isWorking}
            onClick={() => upgrade(env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO_MONTHLY)}
          >
            Upgrade to Pro
          </Button>
        )}
        <Button
          variant="premium"
          disabled={isWorking}
          onClick={() =>
            upgrade(env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO_PLUS_MONTHLY)
          }
        >
          Upgrade to Pro Plus
        </Button>
        <Button
          variant="secondary"
          disabled={isWorking}
          onClick={() => importResume(localResume, replaceTarget.id)}
        >
          Replace &quot;{replaceTargetName}&quot;
        </Button>
        <Button
          variant="ghost"
          disabled={isWorking}
          onClick={() => setDismissed(true)}
        >
          Not now
        </Button>
      </CardFooter>
    </Card>
  );
}

async function dataUrlToFile(dataUrl: string): Promise<File> {
  const blob = await fetch(dataUrl).then((res) => res.blob());
  const extension = blob.type.split("/")[1] || "png";
  return new File([blob], `photo.${extension}`, { type: blob.type });
}
