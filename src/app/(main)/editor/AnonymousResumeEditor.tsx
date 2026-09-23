"use client";

import { ResumeValues } from "@/lib/validation";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { readLocalResume } from "@/lib/localResume";
import useLocalAutoSaveResume from "./useLocalAutoSaveResume";
import ResumeEditorForm from "./ResumeEditorForm";

export default function AnonymousResumeEditor() {
  const [resumeData, setResumeData] = useState<ResumeValues | null>(null);

  // Reading localStorage during the initial render (e.g. via useState's
  // lazy initializer) would run on the server too, where localStorage
  // doesn't exist, and produce a hydration mismatch once the client's
  // real value differs from the server's blank one. Loading it here,
  // after mount, keeps the first render identical on both sides.
  //
  // resumeData starts as null (rather than {}) specifically so
  // ResumeEditorForm — and the react-hook-form instances inside its step
  // forms, which only read their `defaultValues` once, at their own
  // mount — don't mount until the real data has arrived. Mounting them
  // early with a blank {} would lock their fields in as empty even after
  // resumeData is populated a moment later.
  useEffect(() => {
    setResumeData(readLocalResume() ?? {});
  }, []);

  const { isSaving, hasUnsavedChanges } = useLocalAutoSaveResume(
    resumeData ?? {},
  );

  if (resumeData === null) return null;

  return (
    <ResumeEditorForm
      resumeData={resumeData}
      setResumeData={setResumeData as Dispatch<SetStateAction<ResumeValues>>}
      isSaving={isSaving}
      hasUnsavedChanges={hasUnsavedChanges}
      isAnonymous
    />
  );
}
