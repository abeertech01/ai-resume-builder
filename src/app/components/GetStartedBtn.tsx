"use client";

import { Button } from "@/components/ui/button";
import { getUserCount } from "./actions";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function GetStartedBtn() {
  const router = useRouter();

  const getStartedBtn = async () => {
    const userCount = await getUserCount();

    if (userCount >= 20) {
      toast.info("The Developer limited the user number!!", {
        description: "Contact him, if you can't create a new account.",
        position: "top-center",
        style: {
          backgroundColor: "rgb(0, 117, 149)",
          color: "white",
        },
      });
    }

    router.push("/editor");
  };

  return (
    <Button
      size={"lg"}
      variant={"premium"}
      onClick={getStartedBtn}
      className="h-12 px-6 text-base"
    >
      Get started, it&apos;s free
    </Button>
  );
}
