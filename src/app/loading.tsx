import { Loader2 } from "lucide-react";
import { FC } from "react";

interface ComponentProps {}

const loading: FC<ComponentProps> = () => {
  return (
    <div className="flex h-screen items-center justify-center bg-zinc-500/70">
      <Loader2 className="mx-auto my-6 animate-spin" />
    </div>
  );
};

export default loading;
