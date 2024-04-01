import { redirect } from "next/navigation"
import { auth } from "@clerk/nextjs"
import { db } from "@db/client"

import { Editor } from "@/components/dag/editor"

export default async function Page({
  params: { scheduleId }
}: {
  params: {
    scheduleId: string
  }
}) {
  const { userId, protect } = auth()

  protect({
    redirectUrl: "/"
  })

  if (!userId) {
    redirect("/")
  }

  const schedule = await db.schedule.findUnique({
    where: {
      id: scheduleId
    },
    include: {
      versions: {
        select: {
          scheduleId: true,
          blob: true,
          createdAt: true,
          id: true
        },
        orderBy: {
          createdAt: "asc"
        }
      }
    }
  })

  if (!schedule || schedule?.versions.length == 0) {
    redirect("/create")
  }

  // TODO: add check if user can edit or if a user is a student's advisor

  return <Editor versions={schedule.versions} />
}