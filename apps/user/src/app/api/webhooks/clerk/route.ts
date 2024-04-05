import { headers } from "next/headers"
import { WebhookEvent } from "@clerk/nextjs/server"
import { db } from "@repo/db"
import { Webhook } from "svix"

export async function POST(req: Request) {
  const CLERK_USER_WEBHOOK_SECRET = process.env?.["CLERK_USER_WEBHOOK_SECRET"]

  if (!CLERK_USER_WEBHOOK_SECRET) {
    throw new Error("Missing CLERK_USER_WEBHOOK_SECRET value.")
  }

  // Get the headers
  const headerPayload = headers()
  const svix_id = headerPayload.get("svix-id")
  const svix_timestamp = headerPayload.get("svix-timestamp")
  const svix_signature = headerPayload.get("svix-signature")

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Error occurred -- no svix headers", {
      status: 400
    })
  }

  // Get the body
  const payload = await req.json()
  const body = JSON.stringify(payload)

  // Create a new Svix instance with your secret.
  const wh = new Webhook(CLERK_USER_WEBHOOK_SECRET)

  let evt: WebhookEvent

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature
    }) as WebhookEvent
  } catch (err) {
    console.error("Error verifying webhook:", err)
    return new Response("Error occurred", {
      status: 400
    })
  }

  // Get the ID and type

  const eventType = evt.type

  if (eventType === "user.created") {
    const d = evt.data

    const email = d.email_addresses[0]?.email_address!

    await db.user.upsert({
      where: { uid: d.id },
      create: {
        uid: d.id,
        email,
        firstName: d.first_name,
        lastName: d.last_name,
        userType: "STUDENT"
      },
      update: {
        email,
        firstName: d.first_name,
        lastName: d.last_name,
        userType: "STUDENT"
      }
    })
  }

  return new Response("", { status: 200 })
}
