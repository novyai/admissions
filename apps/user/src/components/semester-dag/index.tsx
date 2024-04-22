"use client"

import ReactFlow, {
  Background,
  BezierEdge,
  Controls,
  Edge,
  Instance,
  MiniMap,
  Node,
  NodeDragHandler,
  OnEdgesChange,
  OnNodesChange,
  ReactFlowProvider,
  useReactFlow
} from "reactflow"

import "reactflow/dist/style.css"

// import DevTools from "./devtools"
// import "./devtools/devtools.css"

import { Dispatch, SetStateAction, useCallback, useState } from "react"
import { canMoveCourse, CannotMoveReason } from "@graph/schedule"
import { HydratedStudentProfile } from "@graph/types"
import { RequirementType } from "@prisma/client"
import { cn } from "@ui/lib/utils"

import { EdgeSwitch } from "../dag/edge-switch"
import ScheduleChangeToast from "../dag/schedule-change-toast"
import { isCourseNode, isGhostCourseNode, isSemesterNode } from "./graph-to-node-utils"
import {
  CourseNode,
  CourseNodeData,
  CourseNodeType,
  defaultCourseNode
} from "./nodeTypes/course-node"
import { GhostCourseNode } from "./nodeTypes/ghost-course-node"
import {
  defaultSemesterNode,
  SemesterNode,
  SemesterNodeData,
  SemesterNodeType
} from "./nodeTypes/semester-node"
import {
  getEdgesIDsInCoursePath,
  getModifiedEdge,
  getNodeIDsInCoursePath,
  isGenEdNode
} from "./utils"

const nodeTypes = {
  semesterNode: SemesterNode,
  courseNode: CourseNode,
  ghostCourseNode: GhostCourseNode
}

const edgeTypes = {
  prerequisite: BezierEdge,
  corequisite: BezierEdge
}

type NodeType = SemesterNodeType | CourseNodeType
export type NodeData = SemesterNodeData | CourseNodeData
export type GetNode = Instance.GetNode<SemesterNodeData | CourseNodeData>
type EdgeData = {
  type: RequirementType
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

  const [showEdges, setShowEdges] = useState(false)

  const toggleShowEdges = () => {
    setEdges(edges.map(e => ({ ...e, hidden: showEdges })))
    setShowEdges(!showEdges)
  }

  const { getIntersectingNodes, getNode } = useReactFlow<
    SemesterNodeData | CourseNodeData,
    EdgeData
  >()

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

  const onNodeDragStart: NodeDragHandler = (_e, node: NodeType) => {
    const coursePathNodeIDs = getNodeIDsInCoursePath(node, nodes, edges)
    const coursePathEdgeIDs = getEdgesIDsInCoursePath(coursePathNodeIDs, edges)

    if (isCourseNode(node)) {
      setEdges(
        edges.map(e =>
          getModifiedEdge(
            e,
            coursePathEdgeIDs,
            e => ({
              ...e,
              hidden: false,
              style: { ...e.style, stroke: e.type == "prerequisite" ? "lightskyblue" : "darkblue" }
            }),
            e => ({
              ...e,
              hidden: !showEdges,
              style: { ...e.style, stroke: "lightgray" }
            })
          )
        )
      )
      setNodes(
        nodes
          .filter(n => !isGhostCourseNode(n))
          .map(n => ({
            ...n,
            className: cn(
              n.className,
              `animate-none ${isGenEdNode(n) ? "bg-zinc-100" : "bg-background"}`
            )
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
              setScheduleToastOpen(false)
              return {
                ...n,
                className: cn(n.className, defaultSemesterNode.className, "bg-slate-50")
              }
            }
            if (!canMove.canMove) {
              openScheduleToast(canMove)
            } else {
              setScheduleToastOpen(false)
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
      es.map(e =>
        getModifiedEdge(e, coursePathEdgeIDs, e => ({
          ...e,
          hidden: !showEdges,
          style: { ...e.style, stroke: "lightgray" }
        }))
      )
    )

    const intersections = getIntersectingNodes(node, false).filter(n =>
      isSemesterNode(n)
    ) as SemesterNodeType[]

    if (!intersections[0]) {
      console.log("no intersections")
      handleReset(node)
      return
    }
    if (intersections.length === 0) {
      handleReset(node)
      return
    }
    if (intersections.length !== 1) {
      console.error("Cannot add to multiple semesters")
      handleReset(node)
      return
    }

    const semesterNodeData = intersections[0].data
    if (
      "semesterIndex" in semesterNodeData &&
      semesterNodeData.semesterIndex === node.data.semesterIndex
    ) {
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
        getNode={getNode}
        onOpenChange={(open: boolean) => setScheduleToastOpen(open)}
      />
      <EdgeSwitch checked={showEdges} toggleSwitch={() => toggleShowEdges()} />
      <ReactFlow
        fitView
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStart={onNodeDragStart}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragEnd}
        defaultEdgeOptions={{ hidden: !showEdges, style: { stroke: "lightgray" } }}
      >
        <Background />
        <MiniMap />
        <Controls position="top-left" />
        {/* <DevTools /> */}
      </ReactFlow>
    </div>
  )
}
