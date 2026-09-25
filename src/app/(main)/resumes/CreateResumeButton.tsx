"use client";

import { Button } from "@/components/ui/button";
import usePremiumModal from "@/hooks/usePremiumModal";
import { PlusSquare } from "lucide-react";
import Link from "next/link";
import { FC } from "react";
import { useSubscriptionLevel } from "../SubscriptionLevelProvider";

interface ComponentProps {
  canCreate: boolean;
}

const CreateResumeButton: FC<ComponentProps> = ({ canCreate }) => {
  const subscriptionLevel = useSubscriptionLevel();

  const premiumModal = usePremiumModal();

  if (canCreate) {
    return (
      <Button asChild variant="premium" className="mx-auto flex w-fit gap-2">
        <Link href={"/editor"}>
          <PlusSquare className="size-5" />
          New resume
        </Link>
      </Button>
    );
  }

  return (
    <Button
      variant="premium"
      // A free user (limit 1) can fix this with either paid plan; a Premium
      // user (limit 3) only with Premium Plus, which has no limit.
      onClick={() =>
        premiumModal.openFor(subscriptionLevel === "pro" ? "pro_plus" : "pro")
      }
      className="mx-auto flex w-fit gap-2"
    >
      <PlusSquare className="size-5" />
      New resume
    </Button>
  );
};

export default CreateResumeButton;
