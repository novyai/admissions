"use client"

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

import { Dispatch, SetStateAction, useCallback, useState } from "react"
import { canMoveCourse, CannotMoveReason } from "@graph/schedule"
import { HydratedStudentProfile } from "@graph/types"
import { cn } from "@ui/lib/utils"

import ScheduleChangeToast from "../dag/schedule-change-toast"
import { CourseNode, CourseNodeType, defaultCourseNode } from "./course-node"
import { isCourseNode, isSemesterNode } from "./graph-to-node-utils"
import { defaultSemesterNode, SemesterNode, SemesterNodeType } from "./semester-node"
import { getEdgesIDsInCoursePath, getModifiedEdge, getNodeIDsInCoursePath } from "./utils"

const nodeTypes = {
  semesterNode: SemesterNode,
  courseNode: CourseNode
}

type SemesterDAGProps = {
  nodes: Node[]
  edges: Edge[]
  profile: HydratedStudentProfile
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
  const [scheduleToastOpen, setScheduleToastOpen] = useState(false)
  const [scheduleToastReason, setScheduleToastReason] = useState<CannotMoveReason>()

  const openScheduleToast = (cannotMoveReason: CannotMoveReason) => {
    setScheduleToastOpen(true)
    setScheduleToastReason(cannotMoveReason)
  }

  const { getIntersectingNodes } = useReactFlow()

  const handleReset = (node: CourseNodeType) => {
    resetNodePlacement(node.id)
    setNodes(nds =>
      nds.map(n =>
        n.type === "semesterNode" ?
          {
            ...n,
            className: cn(defaultSemesterNode.className)
          }
        : n
      )
    )
  }

  const onNodeDragStart: NodeDragHandler = (_e, node: SemesterNodeType | CourseNodeType) => {
    const coursePathNodeIDs = getNodeIDsInCoursePath(node, nodes, edges)
    const coursePathEdgeIDs = getEdgesIDsInCoursePath(coursePathNodeIDs, edges)

    if (isCourseNode(node)) {
      setEdges(
        edges.map(e => getModifiedEdge(e, coursePathEdgeIDs, e => ({ ...e, hidden: false })))
      )
      setNodes(
        nodes.map(n => ({
          ...n,
          className: cn(n.className, "animate-none bg-background")
        }))
      )
    }
  }

  const onNodeDrag: NodeDragHandler = useCallback(
    (_e, node: SemesterNodeType | CourseNodeType) => {
      const intersections = getIntersectingNodes(node, false).map(n => n.id)
      if (!isCourseNode(node)) return

      setNodes(ns =>
        ns.map((n: CourseNodeType | SemesterNodeType) => {
          if (isCourseNode(n) || "transfer" in n.data) return n

          if (intersections.includes(n.id)) {
            const canMove = canMoveCourse(node.id, n.data.semesterIndex, profile)

            // if node is overlapping same semester
            if (node.data.semesterIndex === n.data.semesterIndex) {
              console.log("overlapping same semester")
              return {
                ...n,
                className: cn(
                  n.className,
                  defaultSemesterNode.className,
                  "bg-green-50 dark:bg-green-800"
                )
              }
            }
            if (!canMove.canMove) {
              openScheduleToast(canMove)
            }
            return {
              ...n,
              className: cn(
                n.className,
                canMove.canMove ? "bg-green-50 dark:bg-green-800" : "bg-red-50 dark:bg-red-800"
              )
            }
          }

          return {
            ...n,
            className: cn(defaultSemesterNode.className)
          }
        })
      )
    },
    [getIntersectingNodes, setNodes, profile]
  )

  const onNodeDragEnd: NodeDragHandler = (_, node) => {
    if (!isCourseNode(node)) return
    const coursePathNodeIDs = getNodeIDsInCoursePath(node, nodes, edges)
    const coursePathEdgeIDs = getEdgesIDsInCoursePath(coursePathNodeIDs, edges)

    setEdges(es =>
      es.map(e => getModifiedEdge(e, coursePathEdgeIDs, e => ({ ...e, hidden: true })))
    )

    const intersections = getIntersectingNodes(node, false).filter(n => n.type && isSemesterNode(n))

    if (intersections.length === 0) {
      console.error("TODO: NOT DROPPED IN A SEMESTER")
      handleReset(node)
      return
    } else if (intersections.length >= 2) {
      console.error("Cannot add to multiple semesters")
      handleReset(node)
      return
    }

    if (intersections.length !== 1 || !intersections[0]) {
      console.log("no intersections")
      handleReset(node)
      return
    }

    const droppedIn: SemesterNodeType = intersections[0]

    const semester = "semesterIndex" in droppedIn.data ? droppedIn.data.semesterIndex : undefined

    if (!semester) {
      console.log("Cannot add to transfer node")
      handleReset(node)
      return
    }

    const canMove = canMoveCourse(node.id, semester, profile)
    if (!canMove.canMove) {
      console.error("Cannot add to semester", canMove.reason)
      handleReset(node)
    } else {
      console.log("moving", node.id, "to", semester)
      const newNodes = nodes.map(n =>
        n.id === node.id ?
          {
            ...n,
            className: cn(n.className, defaultCourseNode.className),
            data: { ...n.data, semesterIndex: semester }
          }
        : n.id === droppedIn.id ?
          {
            ...n,
            className: cn(defaultSemesterNode.className)
          }
        : n
      )
      saveVersion(newNodes)
    }
  }

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center">
      <ScheduleChangeToast
        open={scheduleToastOpen}
        cannotMoveReason={scheduleToastReason}
        onOpenChange={(open: boolean) => setScheduleToastOpen(open)}
      />
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
        <Controls position="top-left" />
      </ReactFlow>
    </div>
  )
}
