import { create } from "zustand";
import type { SubscriptionLevel } from "@/lib/subscription";

// The cheapest paid plan that unlocks whatever the user just tried to use:
// "pro" means either paid plan does, "pro_plus" means only Premium Plus does.
export type MinimumPlan = Exclude<SubscriptionLevel, "free">;

interface PremiumModalState {
  open: boolean;
  minimumPlan: MinimumPlan;
  openFor: (minimumPlan: MinimumPlan) => void;
  close: () => void;
}

const usePremiumModal = create<PremiumModalState>((set) => ({
  open: false,
  minimumPlan: "pro",
  openFor: (minimumPlan) => set({ open: true, minimumPlan }),
  // Leaves minimumPlan alone so the modal's content doesn't change while it
  // is fading out.
  close: () => set({ open: false }),
}));

export default usePremiumModal;
