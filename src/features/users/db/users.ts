import { prisma } from "@/lib/prisma";
import { clerkClient } from "@clerk/nextjs/server";

type InsertUserData = {
  clerkUserId: string;
  email: string;
  firstName: string;
  lastName: string;
  imageUrl: string;
  role: string;
};

export type UpdateUserData = {
  email?: string;
  firstName?: string | null;
  lastName?: string | null;
  imageUrl?: string;
  role?: string;
};

export type UserFilter = {
  clerkUserId: string;
};

const dbInsertion = async (
  firstName: string,
  lastName: string,
  clerkUserId: string,
  email: string,
  imageUrl: string,
  role: string,
) => {
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

  return {
    ...user,
    role, // Return role for syncClerkUserMetadata
  };
};

export async function insertUser(data: InsertUserData) {
  const { clerkUserId, email, firstName, lastName, imageUrl, role } = data;

  // Check total number of users
  const userCount = await prisma.user.count();

  // If we have 20 users, try to delete an inactive one
  if (userCount >= 20) {
    console.log("user count is 20 or more than 20");
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
      try {
        await prisma.user.delete({
          where: {
            id: oldestInactiveUser.id,
          },
        });
        await (
          await clerkClient()
        ).users.deleteUser(oldestInactiveUser.clerkId);

        // insert the new user
        return await dbInsertion(
          firstName,
          lastName,
          clerkUserId,
          email,
          imageUrl,
          role,
        );
      } catch (error) {
        await (await clerkClient()).users.deleteUser(clerkUserId);

        throw new Error(`Failed to delete oldest inactive user: ${error}`);
      }
    } else {
      // if there is no inactive users exist, delete the clerk user and return to end the process of this function
      try {
        await (await clerkClient()).users.deleteUser(clerkUserId);

        throw new Error("No new user to create. The user limit has been met!");
      } catch (error) {
        console.error(`Failed to delete Clerk user ${clerkUserId}:`, error);
        throw new Error(`Failed to delete Clerk user ${clerkUserId}: ${error}`);
      }
    }
  } else {
    console.log("user count is less than 20");
    return await dbInsertion(
      firstName,
      lastName,
      clerkUserId,
      email,
      imageUrl,
      role,
    );
  }
}

export async function updateUser(filter: UserFilter, data: UpdateUserData) {
  const { clerkUserId } = filter;
  const { email, firstName, lastName, imageUrl, role } = data;

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

  // check if the user exists
  const user = await prisma.user.findUnique({
    where: {
      clerkId: clerkUserId,
    },
  });

  if (!user) {
    console.log("User already removed, skipping cleanup");
    return;
  }

  // Delete the user - this will cascade delete related resumes and subscriptions
  await prisma.user.delete({
    where: {
      clerkId: clerkUserId,
    },
  });
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
