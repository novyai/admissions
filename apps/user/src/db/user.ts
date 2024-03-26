import { db } from "@db/client"

export const getUserFromClerk = async (uid: string) => {
  return db.user.findUnique({
    where: { uid }
  })
}
