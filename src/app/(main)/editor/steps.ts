import { EditorFormProps } from "@/lib/types";
import GeneralInfoForm from "./forms/GeneralInfoForm";
import PersonalInfoForm from "./forms/PersonalInfoForm";
import WorkExperienceForm from "./forms/WorkExperienceForm";
import EducationForm from "./forms/EducationForm";
import SkillsForm from "./forms/SkillsForm";
import SummaryForm from "./forms/SummaryForm";
import { STEP_KEYS } from "./stepKeys";

export const steps: {
  title: string;
  component: React.ComponentType<EditorFormProps>;
  key: string;
}[] = [
  {
    title: "General Info",
    component: GeneralInfoForm,
    key: STEP_KEYS.generalInfo,
  },
  {
    title: "Personal Info",
    component: PersonalInfoForm,
    key: STEP_KEYS.personalInfo,
  },
  {
    title: "Work experience",
    component: WorkExperienceForm,
    key: STEP_KEYS.workExperience,
  },
  {
    title: "Education",
    component: EducationForm,
    key: STEP_KEYS.education,
  },
  {
    title: "Skills",
    component: SkillsForm,
    key: STEP_KEYS.skills,
  },
  {
    title: "Summary",
    component: SummaryForm,
    key: STEP_KEYS.summary,
  },
];
