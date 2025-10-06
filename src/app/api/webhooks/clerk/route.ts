import { env } from "@/env";
import { deleteUser, insertUser, updateUser } from "@/features/users/db/users";
import { syncClerkUserMetadata } from "@/services/clerk";
import { verifyWebhook, WebhookEvent } from "@clerk/nextjs/webhooks";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const evt = await verifyWebhook(req, {
      signingSecret: env.CLERK_WEBHOOK_KEY,
    });

    await eventAction(evt);
  } catch (error) {
    console.error("Error processing Clerk webhook:", error);
    return new Response("Internal Server Error", { status: 400 });
  }

  return new Response("", { status: 200 });
}

const eventAction = async (event: WebhookEvent) => {
  switch (event.type) {
    case "user.created":
    case "user.updated":
      {
        const email = event.data.email_addresses.find(
          (email) => email.id === event.data.primary_email_address_id,
        )?.email_address;
        const firstName = event.data.first_name as string;
        const lastName = event.data.last_name as string;

        if (email == null) return new Response("No email", { status: 400 });
        if (!firstName && !lastName)
          return new Response("No name", { status: 400 });

        if (event.type === "user.created") {
          try {
            const user = await insertUser({
              clerkUserId: event.data.id,
              email,
              firstName,
              lastName,
              imageUrl: event.data.image_url,
              role: "user",
            });
            await syncClerkUserMetadata(user);
          } catch (error) {
            console.error("Failed to insert user:", error);
            // Return 400 to let Clerk know the webhook failed
            // This will prevent the user from being created in Clerk
            return new Response(
              error instanceof Error ? error.message : "Failed to create user",
              { status: 400 },
            );
          }
        } else {
          await updateUser(
            { clerkUserId: event.data.id },
            {
              email,
              firstName,
              lastName,
              imageUrl: event.data.image_url,
              role: (event.data.public_metadata.role as string) || "user",
            },
          );
        }
      }
      break;
    case "user.deleted": {
      if (event.data.id != null) {
        await deleteUser({ clerkUserId: event.data.id });
      }
      break;
    }
  }
};
