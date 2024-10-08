"use server"

import { createBlob, parseBlob } from "@graph/blob"
import { graphToHydratedStudentProfile } from "@graph/graph"
import { createGraph } from "@graph/profile"
import { HydratedStudentProfile } from "@graph/types"
import { db } from "@repo/db"

import {
  getSemesterNodesAndEdges,
  getTransferNodesAndEdges,
  getUnassignedNodesAndEdges
} from "@/components/editor/dag/semester-dag/graph-to-node-utils"

export const createVersion = async (profile: HydratedStudentProfile, scheduleId: string) => {
  const blob = createBlob(profile)
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
  graph,
  transferCredits,
  currentSemester,
  startTerm
}: HydratedStudentProfile) => {
  const { nodes: defaultNodes, edges: defaultEdges } = getSemesterNodesAndEdges(
    semesters,
    currentSemester,
    startTerm
  )
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

export async function hydratedProfileAndNodesByVersion(versionId: string) {
  const version = await db.version.findUnique({
    where: {
      id: versionId
    },
    select: {
      id: true,
      blob: true
    }
  })

  if (!version) {
    throw new Error(`Could not find version with id ${versionId}`)
  }

  const profile = parseBlob(version.blob)

  const { graph, courseToReqList } = await createGraph(profile)

  const hydratedProfile = graphToHydratedStudentProfile(graph, courseToReqList, profile)
  const { defaultNodes, defaultEdges } = await getAllNodesAndEdges(hydratedProfile)

  return { profile: hydratedProfile, defaultNodes, defaultEdges }
}
