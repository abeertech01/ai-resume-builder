"use client";

import { ResumeValues } from "@/lib/validation";
import { useState } from "react";
import { mapToResumeValues } from "@/lib/utils";
import useAutoSaveResume from "./useAutoSaveResume";
import { ResumeServerData } from "@/lib/types";
import ResumeEditorForm from "./ResumeEditorForm";

interface ResumeEditorProps {
  resumeToEdit: ResumeServerData | null;
}

export default function ResumeEditor({ resumeToEdit }: ResumeEditorProps) {
  const [resumeData, setResumeData] = useState<ResumeValues>(
    resumeToEdit ? mapToResumeValues(resumeToEdit) : {},
  );

  const { isSaving, hasUnsavedChanges } = useAutoSaveResume(resumeData);

  return (
    <ResumeEditorForm
      resumeData={resumeData}
      setResumeData={setResumeData}
      isSaving={isSaving}
      hasUnsavedChanges={hasUnsavedChanges}
    />
  );
}
