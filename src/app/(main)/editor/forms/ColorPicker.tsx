import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { PaletteIcon } from "lucide-react";
import { FC, useState } from "react";
import { Color, ColorChangeHandler, TwitterPicker } from "react-color";
import { useSubscriptionLevel } from "../../SubscriptionLevelProvider";
import usePremiumModal from "@/hooks/usePremiumModal";
import { canUseCustomizations } from "@/lib/permissions";

interface ComponentProps {
  color: Color | undefined;
  onChange: ColorChangeHandler;
}

const ColorPicker: FC<ComponentProps> = ({ color, onChange }) => {
  const subscriptionLevel = useSubscriptionLevel();

  const premiumModal = usePremiumModal();

  const [showPopover, setShowPopover] = useState(false);

  return (
    <Popover open={showPopover} onOpenChange={setShowPopover}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          size={"icon"}
          title="Change resume color"
          onClick={(event) => {
            if (!canUseCustomizations(subscriptionLevel)) {
              // Radix's PopoverTrigger also toggles the popover on this same
              // click (composed after this handler). Without preventDefault,
              // it would still force the popover open right after this
              // returns, leaving it open (invisibly, behind the modal's
              // overlay) even though the user isn't allowed to use it.
              event.preventDefault();
              premiumModal.openFor("pro_plus");
              return;
            }
            setShowPopover(true);
          }}
        >
          <PaletteIcon className="size-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="border-none bg-transparent shadow-none"
        align="end"
      >
        <TwitterPicker color={color} onChange={onChange} triangle="top-right" />
      </PopoverContent>
    </Popover>
  );
};

export default ColorPicker;
