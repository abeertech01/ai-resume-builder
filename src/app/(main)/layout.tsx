import PremiumModal from "@/components/premium/PremiumModal";
import Navbar from "./Navbar";
import { getCurrentSession } from "@/features/auth/session";
import { getUserSubscriptionLevel } from "@/lib/subscription";
import SubscriptionLevelProvider from "./SubscriptionLevelProvider";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentSession();

  if (!session) return null;

  const userSubscriptionLevel = await getUserSubscriptionLevel(
    session.user.id,
  );

  return (
    <SubscriptionLevelProvider userSubscriptionLevel={userSubscriptionLevel}>
      <div className="flex min-h-screen flex-col">
        <Navbar user={session.user} />
        {children}
        <PremiumModal />
      </div>
    </SubscriptionLevelProvider>
  );
}
