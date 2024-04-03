"use client"

import { PromptComposer } from "@ui/components/prompt-composer"
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

import { CSSProperties, Dispatch, SetStateAction } from "react"
import { StudentProfile } from "@graph/types"
import { useJsonStream } from "stream-hooks"
import { z } from "zod"

import { CourseNode, CourseNodeType } from "./course-node"
import { isCourseNode } from "./graph-to-node-utils"
import { SemesterNode } from "./semester-node"
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

  const modifyCoursePath = (
    targetNode: CourseNodeType,
    modifyNode: (node: CourseNodeType) => void,
    modifyEdge: (edge: Edge) => void
  ) => {
    const courseNodes = nodes.filter(node => isCourseNode(node)) as CourseNodeType[]
    const connectedNodeIDs = getNodeIDsInCoursePath(targetNode, courseNodes, edges)
    setNodes(ns =>
      ns.map(node => {
        if (connectedNodeIDs.includes(node.id)) {
          modifyNode(node)
        }
        return node
      })
    )

    const connectedEdgeIDs = getEdgesIDsInCoursePath(connectedNodeIDs, edges)
    setEdges(es =>
      es.map(edge => {
        if (connectedEdgeIDs.includes(edge.id)) {
          modifyEdge(edge)
        }
        return edge
      })
    )
  }

  const onNodeDragStart: NodeDragHandler = (_, _node) => {
    if (isCourseNode(_node)) {
      modifyCoursePath(
        _node,
        node => (node.style = { ...node.style, backgroundColor: "lightcyan" }),
        edge => (edge.hidden = false)
      )
    }
  }

  const onNodeDragEnd: NodeDragHandler = (_, _node) => {
    if (isCourseNode(_node)) {
      modifyCoursePath(
        _node,
        node => (node.style = { ...node.style, backgroundColor: "whitesmoke" }),
        edge => (edge.hidden = true)
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
        onNodeDragStop={onNodeDragEnd}
        defaultEdgeOptions={{ hidden: true, style: { stroke: "lightskyblue" } }}
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
