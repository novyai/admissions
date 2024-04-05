import { db } from "../client"

export const getUserById = async ({ id }: { id: string }) => {
  return await db.user.findUnique({ where: { id } })
}

export const getUserByExternalId = async ({ id }: { id: string }) => {
  return await db.user.findUnique({ where: { uid: id } })
}
