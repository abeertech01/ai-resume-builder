import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma";

export type InsertUserData = {
  clerkUserId: string;
  email: string;
  name: string;
  imageUrl: string;
  role: string;
};

export type UpdateUserData = {
  email?: string;
  name?: string;
  imageUrl?: string;
  role?: string;
};

export type UserFilter = {
  clerkUserId: string;
};

export async function insertUser(data: InsertUserData) {
  const { clerkUserId, email, name, imageUrl, role } = data;

  // Check total number of users
  const userCount = await prisma.user.count();

  // If we have 20 users, try to delete an inactive one
  if (userCount >= 20) {
    // Find users that haven't been active in the last 6 hours
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);

    const oldestInactiveUser = await prisma.user.findFirst({
      where: {
        updatedAt: {
          lt: sixHoursAgo,
        },
      },
      orderBy: {
        createdAt: "asc", // Get the oldest user by account age
      },
    });

    if (oldestInactiveUser) {
      // Delete the oldest inactive user to make room
      console.log(
        `Deleting inactive user to make room: ${oldestInactiveUser.email} (created: ${oldestInactiveUser.createdAt}, last active: ${oldestInactiveUser.updatedAt})`,
      );

      try {
        await prisma.user.delete({
          where: {
            id: oldestInactiveUser.id,
          },
        });
        console.log(`Successfully deleted user ${oldestInactiveUser.email}`);
      } catch (error) {
        console.error(
          `Failed to delete inactive user ${oldestInactiveUser.id}:`,
          error,
        );
        throw new Error("Failed to make room for new user");
      }
    } else {
      // No inactive users found, cannot insert new user
      console.log(
        "User limit reached (20) and no inactive users found. Cannot insert new user.",
      );
      throw new Error(
        "User limit reached. Please contact abeer.technology@gmail.com",
      );
    }
  }

  // Split the name into first and last name
  const nameParts = name.trim().split(" ");
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ") || "";

  // Create the new user
  const user = await prisma.user.create({
    data: {
      clerkId: clerkUserId,
      email,
      firstName,
      lastName,
      imageUrl,
    },
  });

  console.log(`Successfully created new user: ${email}`);

  return {
    ...user,
    role, // Return role for syncClerkUserMetadata
  };
}

export async function updateUser(filter: UserFilter, data: UpdateUserData) {
  const { clerkUserId } = filter;
  const { email, name, imageUrl, role } = data;

  // Split the name into first and last name if provided
  let firstName: string | undefined;
  let lastName: string | undefined;

  if (name) {
    const nameParts = name.trim().split(" ");
    firstName = nameParts[0] || "";
    lastName = nameParts.slice(1).join(" ") || "";
  }

  const user = await prisma.user.update({
    where: {
      clerkId: clerkUserId,
    },
    data: {
      ...(email && { email }),
      ...(firstName !== undefined && { firstName }),
      ...(lastName !== undefined && { lastName }),
      ...(imageUrl !== undefined && { imageUrl }),
    },
  });

  return {
    ...user,
    role, // Return role for potential use
  };
}

export async function deleteUser(filter: UserFilter) {
  const { clerkUserId } = filter;

  // Delete the user - this will cascade delete related resumes and subscriptions
  const deletedUser = await prisma.user.delete({
    where: {
      clerkId: clerkUserId,
    },
  });

  return deletedUser;
}

// Additional helper function to get a user by Clerk ID
export async function getUserByClerkId(clerkUserId: string) {
  const user = await prisma.user.findUnique({
    where: {
      clerkId: clerkUserId,
    },
    include: {
      resumes: true,
      subscription: true,
    },
  });

  return user;
}
