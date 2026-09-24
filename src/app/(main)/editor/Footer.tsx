import { Button } from "@/components/ui/button";
import Link from "next/link";
import { steps } from "./steps";
import { FileUserIcon, PenLineIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface FooterProps {
  currentStep: string;
  setCurrentStep: (step: string) => void;
  showSmResumePreview: boolean;
  setShowSmResumePreview: (show: boolean) => void;
  isSaving: boolean;
  isAnonymous: boolean;
}

export default function Footer({
  currentStep,
  setCurrentStep,
  showSmResumePreview,
  setShowSmResumePreview,
  isSaving,
  isAnonymous,
}: FooterProps) {
  const previousStep = steps.find(
    (_, index) => steps[index + 1]?.key === currentStep,
  )?.key;

  const nextStep = steps.find(
    (_, index) => steps[index - 1]?.key === currentStep,
  )?.key;

  return (
    <footer className="w-full border-t px-3 py-5">
      <div className="mx-auto flex max-w-7xl flex-wrap justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button
            variant={"secondary"}
            onClick={
              previousStep ? () => setCurrentStep(previousStep) : undefined
            }
            disabled={!previousStep}
          >
            Previous step
          </Button>
          {nextStep ? (
            <Button variant="premium" onClick={() => setCurrentStep(nextStep)}>
              Next step
            </Button>
          ) : (
            <Button asChild>
              <Link href={isAnonymous ? "/sign-up?from=editor" : "/resumes"}>
                Complete
              </Link>
            </Button>
          )}
        </div>
        <Button
          variant={"outline"}
          onClick={() => setShowSmResumePreview(!showSmResumePreview)}
          className="flex items-center gap-2 md:hidden"
          title={
            showSmResumePreview ? "Show input form" : "Show resume preview"
          }
        >
          {showSmResumePreview ? (
            <>
              <PenLineIcon className="size-4" />
              Edit
            </>
          ) : (
            <>
              <FileUserIcon className="size-4" />
              Preview
            </>
          )}
        </Button>
        <div className="flex items-center gap-3">
          <Button
            asChild
            className="bg-rose-500 text-white shadow-xs hover:bg-rose-600 dark:bg-rose-600 dark:hover:bg-rose-500"
          >
            <Link href={isAnonymous ? "/" : "/resumes"}>Close</Link>
          </Button>
          <p
            className={cn(
              "text-muted-foreground opacity-0",
              isSaving && "opacity-100",
            )}
          >
            Saving...
          </p>
        </div>
      </div>
    </footer>
  );
}
