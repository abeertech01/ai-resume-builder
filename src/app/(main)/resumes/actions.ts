"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/features/auth/session";
import { del } from "@vercel/blob";
import { revalidatePath } from "next/cache";

export async function deleteResume(id: string) {
  const session = await getCurrentSession();

  if (!session) {
    throw new Error("User not authenticated");
  }

  const userId = session.user.id;

  const resume = await prisma.resume.findUnique({
    where: { id, userId },
  });

  if (!resume) {
    throw new Error("Resume not found");
  }

  if (resume.photoUrl) {
    await del(resume.photoUrl);
  }

  await prisma.resume.delete({
    where: { id },
  });

  revalidatePath("/resumes");
}
