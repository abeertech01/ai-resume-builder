import ResumePreview from "@/components/ResumePreview";
import { ResumeValues } from "@/lib/validation";
import { FC } from "react";
import ColorPicker from "./forms/ColorPicker";

interface ComponentProps {
  resumeData: ResumeValues;
  setResumeData: (data: ResumeValues) => void;
}

const ResumePreviewSection: FC<ComponentProps> = ({
  resumeData,
  setResumeData,
}) => {
  return (
    <div className="relative hidden w-1/2 md:flex">
      <div className="absolute top-1 left-1 flex flex-none flex-col gap-3 lg:top-3 lg:left-3">
        <ColorPicker
          color={resumeData.colorHex}
          onChange={(color) =>
            setResumeData({ ...resumeData, colorHex: color.hex })
          }
        />
      </div>
      <div className="bg-secondary flex w-full justify-center overflow-y-auto p-3">
        <ResumePreview
          resumeData={resumeData}
          className="max-w-2xl shadow-md"
        />
      </div>
    </div>
  );
};

export default ResumePreviewSection;
