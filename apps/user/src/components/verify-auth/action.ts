"use server"

import { createUserFromClerkUser } from "@/actions/user"
import { auth } from "@clerk/nextjs"

export const checkAuth = async () => {
  const { user } = auth()

  if (!user || !user.id) {
    return false
  }

  const dbUser = await createUserFromClerkUser(user)

  if (!dbUser) {
    return false
  }
  return true
}
