import { clerkClient } from "@clerk/nextjs/server";

export async function syncClerkUserMetadata(user: {
  id: string;
  clerkId: string;
  role?: string;
  email?: string | null;
}) {
  const client = await clerkClient();

  try {
    // Update Clerk user's public metadata with database user info
    // This allows you to access user's database ID and role from Clerk session
    await client.users.updateUserMetadata(user.clerkId, {
      publicMetadata: {
        dbId: user.id,
        role: user.role || "user",
      },
    });
  } catch (error) {
    // Log error but don't throw - metadata sync is not critical
    console.error(
      `Failed to sync Clerk metadata for user ${user.clerkId}:`,
      error,
    );
  }
}
