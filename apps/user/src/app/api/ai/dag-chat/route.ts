import { getDegreeData } from "@/db/degree"
import { addCourseAgent, generatePrimaryIdentity } from "@ai/agents/add-courses-agent"
import { auth } from "@clerk/nextjs"
import { CourseNode } from "@repo/graph/types"
import OpenAI from "openai"
import { Node } from "reactflow"

import { CourseNodeType } from "@/components/semester-dag/course-node"
import { getUnassignedNodesAndEdges } from "@/components/semester-dag/graph-to-node-utils"

export async function POST(request: Request): Promise<Response> {
  const {
    messages,
    electives,
    prevNodes
  }: {
    messages: OpenAI.ChatCompletionCreateParams["messages"]
    electives: {
      courseSubject: string
      courseNumber: string
      name: string
    }[]
    prevNodes: Node[]
  } = await request.json()

  const { userId } = auth()
  if (!userId) {
    throw new Error("User unauthenticated")
  }

  try {
    // make a completion call with your generated params
    const extraction = await addCourseAgent.completion({
      messages: [
        {
          role: "system",
          content: generatePrimaryIdentity(electives)
        },
        ...messages
      ],
      model: "gpt-4-turbo-preview"
    })

    const newCourseRawData = await getDegreeData(extraction.courses)

    const newCourses = newCourseRawData.allCourses.map(c => ({
      id: c.id,
      earliestFinish: undefined,
      latestFinish: undefined,
      dependents: Array.from(new Set(newCourseRawData.dependentMap.get(c.id) || [])),
      prerequisites: Array.from(new Set(newCourseRawData.prereqMap.get(c.id) || [])),
      name: c.name
    }))

    const graph = new Map<string, CourseNode>()

    newCourses.forEach(n => graph.set(n.id, n))

    const { nodes: newNodes, edges: newEdges } = await getUnassignedNodesAndEdges(
      graph,
      prevNodes,
      []
    )

    const nodes: CourseNodeType[] = newNodes.map((n, i) => ({
      ...n,
      position: {
        x: 200 * i,
        y: -200
      }
    }))

    const edges = newEdges

    return new Response(JSON.stringify({ nodes, edges }))
  } catch (error) {
    console.error(error)
    return new Response("Could not complete chat request.", {
      status: 500
    })
  }
}
