"use client"

import { PromptComposer } from "@ui/components/prompt-composer"
import ReactFlow, {
  Background,
  Controls,
  Edge,
  getConnectedEdges,
  getIncomers,
  getOutgoers,
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

  const onNodeDragStart: NodeDragHandler = useCallback((_, _node) => {
    const incomers = getIncomers(_node, nodes, edges)
    const outgoers = getOutgoers(_node, nodes, edges)

    const connectedNodeIDs = incomers.concat(outgoers).map(node => node.id)
    console.log(connectedNodeIDs)
    setNodes(ns => {
      return ns.map(node => {
        if (_node.id == node.id || connectedNodeIDs.includes(node.id)) {
          node.style = { ...node.style, backgroundColor: "lightcyan" }
        }
        return node
      })
    })

    // const _intersections = getIntersectingNodes(node).map(n => n.id)
    // setNodes(ns =>
    //   ns.map(n => {
    //     if (n.type === "courseNode") return n
    //     return {
    //       ...n,
    //       style: {
    //         ...n.style,
    //         backgroundColor: intersections.includes(n.id) ? "red" : ""
    //       }
    //     }
    //   })
    // )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onNodeDragEnd: NodeDragHandler = useCallback((_, _node) => {
    setNodes(ns => {
      return ns.map(node => {
        if (_node.id == node.id) {
          node.style = { ...node.style, backgroundColor: "hsl(var(--accent)" }
        }
        return node
      })
    })
  }, [])

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
        onNodeDragStop={onNodeDragEnd}
        // defaultEdgeOptions={{ hidden: true }}
      >
        <Background />
        <MiniMap />
        <Controls />
      </ReactFlow>
      <div className="w-full p-2">
        <PromptComposer
          placeholder="What courses should I add?"
          onSubmit={onSubmit}
          loading={loading}
        />
      </div>
    </div>
  )
}
