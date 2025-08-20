"use server";

import { prisma } from "@/lib/prisma";

// get user count
export async function getUserCount() {
  return await prisma.user.count();
}
