"use server"

import { db } from "@db/client"
import { StudentProfile } from "@graph/types"
import { Node } from "reactflow"

import { createBlob } from "@/lib/version-blob"

export const createVersion = async (profile: StudentProfile, scheduleId: string, nodes: Node[]) => {
  const blob = createBlob(profile, nodes)
  const newVersion = await db.version.create({
    data: {
      scheduleId,
      blob
    }
  })
  return newVersion
}
