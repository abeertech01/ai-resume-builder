import { prisma } from "@/lib/prisma";
import { resumeDataInclude } from "@/lib/types";
import { getCurrentSession } from "@/features/auth/session";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import CreateResumeButton from "./CreateResumeButton";
import ResumeItem from "./ResumeItem";
import LocalResumeSync from "./LocalResumeSync";
import { getUserSubscriptionLevel } from "@/lib/subscription";
import { canCreateResume } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Your Resumes",
};

export default async function Page() {
  const session = await getCurrentSession();

  // The (main) layout no longer gates this centrally, since it allows
  // anonymous access to /editor — this page still requires an account.
  if (!session) redirect("/sign-in");

  const userId = session.user.id;

  const [resumes, totalCount, subscriptionLevel] = await Promise.all([
    prisma.resume.findMany({
      where: {
        userId,
      },
      orderBy: {
        updatedAt: "desc",
      },
      include: resumeDataInclude,
    }),
    prisma.resume.count({
      where: {
        userId,
      },
    }),
    getUserSubscriptionLevel(userId),
  ]);

  const canCreate = canCreateResume(subscriptionLevel, totalCount);

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-3 py-6">
      <LocalResumeSync
        subscriptionLevel={subscriptionLevel}
        canImport={canCreate}
        existingResumes={resumes.map(({ id, title }) => ({ id, title }))}
      />
      <CreateResumeButton canCreate={canCreate} />
      <div className="space-y-1">
        <h1 className="font-heading text-3xl font-bold">Your Resumes</h1>
        <p>Total: {totalCount}</p>
      </div>
      <div className="flex w-full grid-cols-2 flex-col gap-3 sm:grid md:grid-cols-3 lg:grid-cols-4">
        {resumes.map((resume) => (
          <ResumeItem key={resume.id} resume={resume} />
        ))}
      </div>
    </main>
  );
}
