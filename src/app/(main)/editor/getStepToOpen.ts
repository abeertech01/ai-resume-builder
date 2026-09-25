import type { ResumeServerData } from "@/lib/types";
import { STEP_KEYS, type StepKey } from "./stepKeys";

const hasText = (value: string | null | undefined) => !!value?.trim();

// Which step should the editor open on for a saved resume? The first one
// that isn't done yet, or the last step (Summary) if every step is.
//
// Nothing stores which steps are finished, so it's worked out from the saved
// data. Things people commonly skip (description, photo, last name, phone)
// deliberately don't count against a step. Summary has no rule of its own:
// it's the last step, so it's where we land once everything before it is done.
export function getStepToOpen(resume: ResumeServerData): StepKey {
  // "Add work experience" / "Add education" save a blank entry, so an entry
  // only counts once something is filled in.
  const hasWorkExperience = resume.workExperiences.some(
    (exp) =>
      hasText(exp.position) ||
      hasText(exp.company) ||
      hasText(exp.description) ||
      exp.startDate !== null ||
      exp.endDate !== null,
  );

  const hasEducation = resume.educations.some(
    (edu) =>
      hasText(edu.degree) ||
      hasText(edu.school) ||
      edu.startDate !== null ||
      edu.endDate !== null,
  );

  const stepsInOrder: [StepKey, boolean][] = [
    [STEP_KEYS.generalInfo, hasText(resume.title)],
    [
      STEP_KEYS.personalInfo,
      [
        resume.firstName,
        resume.jobTitle,
        resume.city,
        resume.country,
        resume.email,
      ].every(hasText),
    ],
    [STEP_KEYS.workExperience, hasWorkExperience],
    [STEP_KEYS.education, hasEducation],
    [STEP_KEYS.skills, resume.skills.some(hasText)],
  ];

  const firstUnfinished = stepsInOrder.find(([, isDone]) => !isDone);

  return firstUnfinished ? firstUnfinished[0] : STEP_KEYS.summary;
}
