import { Loader2 } from "lucide-react";

const loading = () => {
  return (
    <div className="flex h-screen items-center justify-center bg-zinc-500/70">
      <Loader2 className="mx-auto my-6 animate-spin" />
    </div>
  );
};

export default loading;
