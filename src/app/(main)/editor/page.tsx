import { Metadata } from "next";
import ResumeEditor from "./ResumeEditor";
import { getCurrentSession } from "@/features/auth/session";
import { prisma } from "@/lib/prisma";
import { resumeDataInclude } from "@/lib/types";

interface PageProps {
  searchParams: Promise<{ resumeId?: string }>;
}

export const metadata: Metadata = {
  title: "Design your resume",
};

export default async function Page({ searchParams }: PageProps) {
  const { resumeId } = await searchParams;

  const session = await getCurrentSession();

  if (!session) return null;

  const resumeToEdit = resumeId
    ? await prisma.resume.findUnique({
        where: { id: resumeId, userId: session.user.id },
        include: resumeDataInclude,
      })
    : null;

  return <ResumeEditor resumeToEdit={resumeToEdit} />;
}
