import LoadingButton from "@/components/LoadingButton";
import { ResumeValues } from "@/lib/validation";
import { WandSparklesIcon } from "lucide-react";
import { FC, useState } from "react";
import { toast } from "sonner";
import { generateSummary } from "./actions";

interface ComponentProps {
  resumeData: ResumeValues;
  onSummaryGenerated: (summary: string) => void;
}

const GenerateSummaryButton: FC<ComponentProps> = ({
  resumeData,
  onSummaryGenerated,
}) => {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    // TODO: Block for non-premium users

    try {
      setLoading(true);
      const aiResponse = await generateSummary(resumeData);
      onSummaryGenerated(aiResponse);
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong. Please try again later.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <LoadingButton
      variant={"outline"}
      type="button"
      onClick={handleClick}
      loading={loading}
    >
      <WandSparklesIcon className="size-4" />
      Generate AI
    </LoadingButton>
  );
};

export default GenerateSummaryButton;
