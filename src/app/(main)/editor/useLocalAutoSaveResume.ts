import useDebounce from "@/hooks/useDebounce";
import {
  LocalPhotoTooLargeError,
  writeLocalResume,
} from "@/lib/localResume";
import { fileReplacer } from "@/lib/utils";
import { ResumeValues } from "@/lib/validation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function useLocalAutoSaveResume(resumeData: ResumeValues) {
  const debouncedResumeData = useDebounce(resumeData, 800);

  const [lastSavedData, setLastSavedData] = useState(
    structuredClone(resumeData),
  );

  const [isSaving, setIsSaving] = useState(false);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    setIsError(false);
  }, [debouncedResumeData]);

  useEffect(() => {
    async function save() {
      try {
        setIsSaving(true);
        setIsError(false);

        const newData = structuredClone(debouncedResumeData);

        await writeLocalResume(newData);

        setLastSavedData(newData);
      } catch (error) {
        setIsError(true);
        console.error(error);
        toast.error("Something went wrong while saving your resume.", {
          description:
            error instanceof LocalPhotoTooLargeError
              ? "Your photo is too large to save in the browser. Try a smaller image."
              : "Please try again.",
          action: {
            label: "Retry",
            onClick: () => {
              save(); // call your save function here
            },
          },
        });
      } finally {
        setIsSaving(false);
      }
    }

    const hasUnsavedChanges =
      JSON.stringify(debouncedResumeData, fileReplacer) !==
      JSON.stringify(lastSavedData, fileReplacer);

    if (hasUnsavedChanges && debouncedResumeData && !isSaving && !isError) {
      save();
    }
  }, [debouncedResumeData, isSaving, lastSavedData, isError]);

  return {
    isSaving,
    hasUnsavedChanges:
      JSON.stringify(resumeData) !== JSON.stringify(lastSavedData),
  };
}
