import { db } from "@repo/db"

export const getUserFromClerk = async (uid: string) => {
  return db.user.findUnique({
    where: { uid }
  })
}
