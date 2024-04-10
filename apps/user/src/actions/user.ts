"use server"

import { User } from "@clerk/nextjs/server"
import { db } from "@db/client"

export async function getUserByExternalId({ uid }: { uid: string }) {
  const user = await db.user.findFirst({
    where: {
      uid
    }
  })

  return user
}

export async function createUserFromClerkUser({ emailAddresses, firstName, lastName, id }: User) {
  const email = emailAddresses[0]?.emailAddress
  return await db.user.upsert({
    where: { uid: id },
    create: {
      uid: id,
      email,
      firstName,
      lastName,
      userType: "STUDENT"
    },
    update: {
      email,
      firstName,
      lastName,
      userType: "STUDENT"
    }
  })
}
