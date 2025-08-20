import { prisma } from "@/lib/prisma";
import { clerkClient } from "@clerk/nextjs/server";

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

/**
 * -- check user count ✅
 * -- if user count is 20 or more than 20, ✅
 *   -- if there are one or more users inactive at least for 6 hours ✅
 *     -- delete the oldest inactive user ✅
 *     -- insert the new user ✅
 *     -- if error happens, ✅
 *       -- delete the clerk user and throw an error ✅
 *   -- if there are no users inactive for at least 6 hours, ✅
 *     -- delete the clerk user and return to the end of the process of this function ✅
 * -- if user count is less than 20, ✅
 *   -- create the user ✅
 */

const dbInsertion = async (
  name: string,
  clerkUserId: string,
  email: string,
  imageUrl: string,
  role: string,
) => {
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
};

export async function insertUser(data: InsertUserData) {
  const { clerkUserId, email, name, imageUrl, role } = data;

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

        // insert the new user
        return await dbInsertion(name, clerkUserId, email, imageUrl, role);
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
    console.log("user count is less than 3");
    return await dbInsertion(name, clerkUserId, email, imageUrl, role);
  }
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
