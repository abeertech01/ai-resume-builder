import { FC, ComponentProps as ReactComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type ButtonProps = ReactComponentProps<typeof Button>;

interface ComponentProps extends ButtonProps {
  loading: boolean;
}

const LoadingButton: FC<ComponentProps> = ({
  loading,
  disabled,
  className,
  ...props
}) => {
  return (
    <Button
      disabled={loading || disabled}
      className={cn("flex items-center gap-2", className)}
      {...props}
    >
      {loading && <Loader2 className="size-5 animate-spin" />}
      {props.children}
    </Button>
  );
};

export default LoadingButton;
