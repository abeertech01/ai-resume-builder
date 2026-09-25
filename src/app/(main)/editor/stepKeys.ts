// The keys live apart from steps.ts, which imports every form component, so
// code that only needs a key (like the resume list) doesn't pull them all in.
export const STEP_KEYS = {
  generalInfo: "general-info",
  personalInfo: "personal-info",
  workExperience: "work-experience",
  education: "education",
  skills: "skill",
  summary: "summary",
} as const;

export type StepKey = (typeof STEP_KEYS)[keyof typeof STEP_KEYS];
