"use server"

import { db } from "@db/client"

export async function createConversationForUser({ userId }: { userId: string }) {
  const conversation = await db.conversation.create({
    data: {
      userId
    }
  })

  return conversation
}
