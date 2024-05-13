import { redirect } from "next/navigation"
import { auth } from "@clerk/nextjs/server"
import Prisma from "@db/client"
import { createConversationFromClerkUser } from "@db/queries/conversation"
import { parseBlob } from "@graph/blob"
import { db } from "@repo/db"

import { Editor } from "@/components/editor/editor"

const TRACK_QUERY = {
  include: {
    requirementGroup: {
      include: {
        requirementSubgroups: {
          include: {
            requirements: {
              include: {
                courses: true
              }
            }
          }
        },
        requirements: {
          include: {
            courses: true
          }
        }
      }
    }
  }
} satisfies Prisma.TrackDefaultArgs

export type TrackDataPayload = Prisma.TrackGetPayload<typeof TRACK_QUERY>

const SCHEDULE_QUERY = {
  select: {
    id: true,
    userID: true,
    createdAt: true,
    activeDraftId: true,
    versions: {
      select: {
        id: true,
        blob: true
      }
    }
  }
}
export type ScheduleDataPayload = Prisma.ScheduleGetPayload<typeof SCHEDULE_QUERY>

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

  const schedule: ScheduleDataPayload | null = await db.schedule.findUnique({
    where: {
      id: scheduleId
    },
    select: {
      id: true,
      userID: true,
      createdAt: true,
      activeDraftId: true,
      versions: {
        select: {
          id: true,
          blob: true
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

  const baseProfile = parseBlob(schedule.versions[0].blob)

  const trackData: TrackDataPayload | null = await db.track.findUnique({
    where: {
      id: baseProfile.tracks[0]
    },
    ...TRACK_QUERY
  })

  // new conversation for the user every time they view the schedule for now
  const conversation = await createConversationFromClerkUser({
    userId
  })

  if (!schedule || schedule?.versions.length == 0) {
    redirect("/create")
  }

  // TODO: add check if user can edit or if a user is a student's advisor

  return (
    <Editor
      initialSchedule={schedule}
      trackData={trackData}
      scheduleId={scheduleId}
      conversation={conversation}
    />
  )
}
