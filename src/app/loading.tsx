import { Loader2 } from "lucide-react";
import { FC } from "react";

interface ComponentProps {}

const loading: FC<ComponentProps> = () => {
  return <Loader2 className="mx-auto my-6 animate-spin" />;
};

export default loading;
