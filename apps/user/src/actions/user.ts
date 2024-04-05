"use server"

import { db } from "@db/client"

export async function getUserByExternalId({ uid }: { uid: string }) {
  const user = await db.user.findFirst({
    where: {
      uid
    }
  })

  return user
}
