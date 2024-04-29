"use server"

import { createUserFromClerkUser } from "@/actions/user"
import { currentUser } from "@clerk/nextjs/server"

export const checkAuth = async () => {
  const user = await currentUser()

  if (!user || !user.id) {
    return false
  }

  const dbUser = await createUserFromClerkUser(user)

  if (!dbUser) {
    return false
  }
  return true
}
