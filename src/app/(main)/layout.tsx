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

  // Anonymous visitors reach this layout only via /editor (see
  // middleware.ts's publicRoutes) to use their free-tier resume, stored
  // in the browser rather than the DB. Every other route under (main)
  // still requires a session and redirects for itself — this layout no
  // longer enforces that centrally.
  const userSubscriptionLevel = session
    ? await getUserSubscriptionLevel(session.user.id)
    : "free";

  return (
    <SubscriptionLevelProvider userSubscriptionLevel={userSubscriptionLevel}>
      <div className="flex min-h-screen flex-col">
        <Navbar user={session?.user ?? null} />
        {children}
        <PremiumModal />
      </div>
    </SubscriptionLevelProvider>
  );
}
