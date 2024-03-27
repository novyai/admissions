"use server"

import { auth } from "@clerk/nextjs"
import { db } from "@db/client"

export const checkAuth = async () => {
  const { userId } = auth()

  if (!userId) {
    return false
  }

  const user = await db.user.findUnique({ where: { uid: userId } })
  if (!user) {
    return false
  }
  return true
}
