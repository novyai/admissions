"use server"

import { db } from "@db/client"
import { StudentProfile } from "@graph/types"
import { Node } from "reactflow"

import { createBlob } from "@/lib/version-blob"
import {
  getSemesterNodesAndEdges,
  getTransferNodesAndEdges,
  getUnassignedNodesAndEdges
} from "@/components/semester-dag/graph-to-node-utils"

export const createVersion = async (profile: StudentProfile, scheduleId: string, nodes: Node[]) => {
  const blob = JSON.stringify(createBlob(profile, nodes))
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
  allCourses,
  graph,
  transferCredits
}: StudentProfile) => {
  const { nodes: defaultNodes, edges: defaultEdges } = getSemesterNodesAndEdges(
    semesters,
    allCourses
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
