import { redirect } from "next/navigation"
import { auth } from "@clerk/nextjs/server"
import { createConversationFromClerkUser } from "@db/queries/conversation"
import { db } from "@repo/db"

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
    unauthenticatedUrl: "/"
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
          // scheduleId: true,
          // blob: true,
          // createdAt: true,
          id: true
        },
        orderBy: {
          createdAt: "asc"
        }
      }
    }
  })

  // new conversation for the user every time they view the schedule for now
  const conversation = await createConversationFromClerkUser({
    userId
  })

  if (!schedule || schedule?.versions.length == 0) {
    redirect("/create")
  }

  // TODO: add check if user can edit or if a user is a student's advisor

  return <Editor versions={schedule.versions} scheduleId={scheduleId} conversation={conversation} />
}
