"use client"

import { PromptComposer } from "@repo/ui/components/prompt-composer"
import ReactFlow, {
  Background,
  Controls,
  Edge,
  MiniMap,
  Node,
  NodeDragHandler,
  OnEdgesChange,
  OnNodesChange,
  ReactFlowProvider,
  useReactFlow
} from "reactflow"

import "reactflow/dist/style.css"

import { Dispatch, SetStateAction, useCallback } from "react"
import { canMoveCourse } from "@graph/schedule"
import { StudentProfile } from "@graph/types"
import { cn } from "@ui/lib/utils"
import { useJsonStream } from "stream-hooks"
import { z } from "zod"

import { CourseNode, CourseNodeType, defaultCourseNode } from "./course-node"
import { isCourseNode, isSemesterNode } from "./graph-to-node-utils"
import { defaultSemesterNode, SemesterNode, SemesterNodeType } from "./semester-node"
import { getEdgesIDsInCoursePath, getNodeIDsInCoursePath } from "./utils"

const nodeTypes = {
  semesterNode: SemesterNode,
  courseNode: CourseNode
}

type SemesterDAGProps = {
  nodes: Node[]
  edges: Edge[]
  profile: StudentProfile
  saveVersion: (nodes: Node[]) => Promise<void>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setNodes: Dispatch<SetStateAction<Node<any, string | undefined>[]>>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setEdges: Dispatch<SetStateAction<Edge<any>[]>>
  onNodesChange: OnNodesChange
  onEdgesChange: OnEdgesChange
  resetNodePlacement: (id: string) => void
}

export function SemesterDAG(props: SemesterDAGProps) {
  return (
    <ReactFlowProvider>
      <SemesterDAGInternal {...props} />
    </ReactFlowProvider>
  )
}

function SemesterDAGInternal({
  nodes,
  edges,
  profile,
  setNodes,
  setEdges,
  onNodesChange,
  onEdgesChange,
  saveVersion,
  resetNodePlacement
}: SemesterDAGProps) {
  const { getIntersectingNodes } = useReactFlow()

  const modifyCoursePathEdge = (
    edge: Edge,
    connectedNodeIDs: string[],
    modifyEdge: (edge: Edge) => void
  ) => {
    const connectedEdgeIDs = getEdgesIDsInCoursePath(connectedNodeIDs, edges)
    if (connectedEdgeIDs.includes(edge.id)) {
      modifyEdge(edge)
    }
  }

  const modifyCoursePathNode = (
    node: CourseNodeType,
    connectedNodeIDs: string[],
    modifyNode: (node: CourseNodeType) => void
  ) => {
    if (connectedNodeIDs.includes(node.id)) {
      modifyNode(node)
    }
  }

  const onNodeDragStart: NodeDragHandler = (_e, node: SemesterNodeType | CourseNodeType) => {
    const coursePathNodeIDs = getNodeIDsInCoursePath(node, nodes, edges)

    if (isCourseNode(node)) {
      setEdges(es =>
        es.map(e => {
          modifyCoursePathEdge(e, coursePathNodeIDs, e => (e.hidden = false))
          return e
        })
      )
    }
  }

  const onNodeDrag: NodeDragHandler = useCallback(
    (_e, node: SemesterNodeType | CourseNodeType) => {
      const intersections = getIntersectingNodes(node, false).map(n => n.id)

      setNodes(ns =>
        ns.map(n => {
          if (isCourseNode(n)) return n

          if (intersections.includes(n.id)) {
            const canMove = canMoveCourse(node.id, n.data.semester - 1, profile)

            // if node is overlapping same semester
            if ("semesterIndex" in node.data && node.data.semesterIndex === n.data.semester) {
              return {
                ...n,
                className: cn(
                  n.className,
                  defaultSemesterNode.className,
                  "bg-green-200 dark:bg-green-800"
                )
              }
            }
            return {
              ...n,
              className: cn(
                n.className,
                canMove.canMove ? "bg-green-200 dark:bg-green-800" : "bg-red-200 dark:bg-red-800"
              )
            }
          }

          return {
            ...n,
            className: cn(n.className, defaultSemesterNode.className)
          }
        })
      )
    },
    [getIntersectingNodes, setNodes, profile]
  )

  const onNodeDragEnd: NodeDragHandler = (_, node) => {
    if (!isCourseNode(node)) return
    const coursePathNodeIDs = getNodeIDsInCoursePath(node, nodes, edges)

    setEdges(es =>
      es.map(e => {
        modifyCoursePathEdge(e, coursePathNodeIDs, e => (e.hidden = true))
        return e
      })
    )

    setNodes(ns =>
      ns.map(n => {
        if (isCourseNode(n)) {
          modifyCoursePathNode(n, coursePathNodeIDs, n => (n.style = { ...n.style }))
        }
        return n
      })
    )

    const intersections = getIntersectingNodes(node, false).filter(n => n.type && isSemesterNode(n))

    if (intersections.length === 0) {
      console.error("TODO: NOT DROPPED IN A SEMESTER")
      resetNodePlacement(node.id)
      return
    } else if (intersections.length >= 2) {
      console.error("Cannot add to multiple semesters")
      resetNodePlacement(node.id)
      return
    }

    if (intersections.length !== 1 || !intersections[0]) {
      console.log("no intersections")
      resetNodePlacement(node.id)
      return
    }

    const droppedIn: SemesterNodeType = intersections[0]

    const semester = "semesterIndex" in droppedIn.data ? droppedIn.data.semesterIndex : undefined

    if (!semester) {
      console.log("Cannot add to transfer node")
      resetNodePlacement(node.id)
      return
    }

    const canMove = canMoveCourse(node.id, semester - 1, profile)
    if (!canMove.canMove) {
      console.error("Cannot add to semester", canMove.reason)
      resetNodePlacement(node.id)
      setNodes(nds =>
        nds.map(n =>
          n.id === droppedIn.id ?
            {
              ...n,
              className: cn(n.className, defaultSemesterNode.className)
            }
          : n
        )
      )
    } else {
      console.log("moving", node.id, "to", semester, semester - 1)
      setNodes(nds =>
        nds.map(n =>
          n.id === node.id ?
            {
              ...n,
              className: cn(n.className, defaultCourseNode.className),
              data: { ...n.data, semesterIndex: semester }
            }
          : n.id === droppedIn.id ?
            {
              ...n,
              className: cn(n.className, defaultSemesterNode.className)
            }
          : n
        )
      )
    }
  }

  const { startStream, loading } = useJsonStream({
    schema: z.object({
      nodes: z.array(z.custom<CourseNodeType>()),
      edges: z.array(z.custom<Edge>())
    }),
    onEnd: async ({ nodes, edges }) => {
      setNodes(nodes)
      setEdges(edges)
      saveVersion(nodes)
    }
  })

  const onSubmit = function (value: string) {
    startStream({
      url: "/api/ai/dag-chat",
      body: {
        messages: [
          {
            role: "user",
            content: value
          }
        ],
        electives: [
          {
            courseSubject: "CAP",
            courseNumber: "4034",
            name: "Computer Animation Fundamentals"
          },
          {
            courseNumber: "4103",
            courseSubject: "CAP",
            name: "Mobile Biometrics"
          }
        ],
        prevNodes: nodes
      }
    })
  }

  return (
    <div className="w-full h-full flex flex-col items-center justify-center">
      <ReactFlow
        fitView
        nodeTypes={nodeTypes}
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStart={onNodeDragStart}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragEnd}
        defaultEdgeOptions={{ hidden: true, style: { stroke: "lightskyblue" } }}
      >
        <Background />
        <MiniMap />
        <Controls />
      </ReactFlow>

      <div className="w-full p-2">
        <PromptComposer
          prompt=""
          onChange={() => {}}
          placeholder="What courses should I add?"
          onSubmit={onSubmit}
          loading={loading}
        />
      </div>
    </div>
  )
}
