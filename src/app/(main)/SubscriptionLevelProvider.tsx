"use client";

import { SubscriptionLevel } from "@/lib/subscriptions";
import { createContext, FC, ReactNode, useContext } from "react";

const SubscriptionLevelContext = createContext<SubscriptionLevel | undefined>(
  undefined,
);

interface ComponentProps {
  children: ReactNode;
  userSubscriptionLevel: SubscriptionLevel;
}

const SubscriptionLevelProvider: FC<ComponentProps> = ({
  children,
  userSubscriptionLevel,
}) => {
  return (
    <SubscriptionLevelContext.Provider value={userSubscriptionLevel}>
      {children}
    </SubscriptionLevelContext.Provider>
  );
};

export function useSubscriptionLevel() {
  const context = useContext(SubscriptionLevelContext);
  if (context === undefined) {
    throw new Error(
      "useSubscriptionLevel must be used within a SubscriptionLevelProvider",
    );
  }

  return context;
}

export default SubscriptionLevelProvider;
