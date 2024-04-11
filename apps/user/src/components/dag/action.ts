"use server"

import { graphToStudentProfile, studentProfileToGraph } from "@graph/graph"
import { HydratedStudentProfile, StudentProfile } from "@graph/types"
import { db } from "@repo/db"
import { z } from "zod"

import { createBlob } from "@/lib/version-blob"
import {
  getSemesterNodesAndEdges,
  getTransferNodesAndEdges,
  getUnassignedNodesAndEdges
} from "@/components/semester-dag/graph-to-node-utils"

export const createVersion = async (profile: StudentProfile, scheduleId: string) => {
  const blob = JSON.stringify(createBlob(profile))
  const newVersion = await db.version.create({
    data: {
      scheduleId,
      blob
    }
  })

  return newVersion
}

export const getAllNodesAndEdges = async ({
  semesters,
  // allCourses,
  graph,
  transferCredits
}: HydratedStudentProfile) => {
  const { nodes: defaultNodes, edges: defaultEdges } = getSemesterNodesAndEdges(semesters)

  // if there are transfer credits, we want to render them and their edges
  if (transferCredits.length > 0) {
    const transferNodesAndEdges = getTransferNodesAndEdges(transferCredits, graph)

    defaultNodes.push(...transferNodesAndEdges.nodes)
    defaultEdges.push(...transferNodesAndEdges.edges)
  }

  // we also want to display all nodes not in transfer or a semester and its edges

  const { nodes: unassignedNodes, edges: unassignedEdges } = await getUnassignedNodesAndEdges(
    graph,
    defaultNodes,
    transferCredits.map(c => {
      const n = graph.get(c)
      if (!n) {
        throw new Error(`Could not find course with id ${c}`)
      }
      return n
    })
  )

  defaultNodes.push(...unassignedNodes)
  defaultEdges.push(...unassignedEdges)

  return { defaultNodes, defaultEdges }
}

const blobSchema = z.object({
  profile: z.custom<StudentProfile>(),
  nodes: z.array(
    z.object({
      id: z.string(),
      position: z.object({
        x: z.number(),
        y: z.number()
      })
    })
  )
})

export async function hydratedProfileAndNodesByVersion(versionId: string) {
  const version = await db.version.findUnique({
    where: {
      id: versionId
    },
    select: {
      blob: true
    }
  })

  if (!version) {
    throw new Error(`Could not find version with id ${versionId}`)
  }

  const parsedBlob = blobSchema.safeParse(JSON.parse(version.blob as string))

  if (!parsedBlob.success) {
    throw new Error(parsedBlob.error.message)
  }

  const { profile } = parsedBlob.data

  console.log(profile)

  const graph = studentProfileToGraph(profile)

  const hydratedProfile = graphToStudentProfile(graph, profile)

  const { defaultNodes, defaultEdges } = await getAllNodesAndEdges(hydratedProfile)

  return { profile: hydratedProfile, defaultNodes, defaultEdges }
}
