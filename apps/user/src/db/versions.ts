"use server"

import { db } from "@db/client"
import { XYPosition } from "reactflow"

type PersistedNode = {
  id: string
  position: XYPosition
}

export type NewVersion = {
  semesters: string[][]
  nodes: PersistedNode[]
}

export async function getVersions(userID: string) {
  return db.version.findMany({
    where: {
      userID
    },
    orderBy: {
      createdAt: "desc"
    }
  })
}

export async function createVersion(_version: NewVersion) {
  // db.versions.insert(version)
  console.log("new version created")
}
