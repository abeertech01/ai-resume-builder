"use client";

import { ResumeValues } from "@/lib/validation";
import { useEffect, useState } from "react";
import { readLocalResume } from "@/lib/localResume";
import useLocalAutoSaveResume from "./useLocalAutoSaveResume";
import ResumeEditorForm from "./ResumeEditorForm";

export default function AnonymousResumeEditor() {
  const [resumeData, setResumeData] = useState<ResumeValues>({});

  // Reading localStorage during the initial render (e.g. via useState's
  // lazy initializer) would run on the server too, where localStorage
  // doesn't exist, and produce a hydration mismatch once the client's
  // real value differs from the server's blank one. Loading it here,
  // after mount, keeps the first render identical on both sides.
  useEffect(() => {
    const localResume = readLocalResume();
    if (localResume) setResumeData(localResume);
  }, []);

  const { isSaving, hasUnsavedChanges } = useLocalAutoSaveResume(resumeData);

  return (
    <ResumeEditorForm
      resumeData={resumeData}
      setResumeData={setResumeData}
      isSaving={isSaving}
      hasUnsavedChanges={hasUnsavedChanges}
    />
  );
}
