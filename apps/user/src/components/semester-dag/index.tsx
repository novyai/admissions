"use client"

import { PromptComposer } from "@ui/components/prompt-composer"
import ReactFlow, {
  Background,
  Controls,
  Edge,
  MiniMap,
  Node,
  NodeDragHandler,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow
} from "reactflow"

import "reactflow/dist/style.css"

import { useCallback } from "react"
import { useJsonStream } from "stream-hooks"
import { z } from "zod"

import { CourseNode, CourseNodeType } from "./course-node"
import { SemesterNode } from "./semester-node"

type SemesterDAGProps = {
  nodes: Node[]
  edges: Edge[]
  saveVersion: (nodes: Node[]) => Promise<void>
}

export function SemesterDAG(props: SemesterDAGProps) {
  return (
    <ReactFlowProvider>
      <SemesterDAGInternal {...props} />
    </ReactFlowProvider>
  )
}

function SemesterDAGInternal({
  nodes: initialNodes,
  edges: initialEdges,
  saveVersion
}: SemesterDAGProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  const { getIntersectingNodes } = useReactFlow()

  const onNodeDrag: NodeDragHandler = useCallback((_, node) => {
    const intersections = getIntersectingNodes(node, false).map(n => n.id)

    setNodes(ns =>
      ns.map(n => {
        if (n.type === "courseNode") return n

        return {
          ...n,
          style: {
            ...n.style,
            backgroundColor: intersections.includes(n.id) ? "red" : ""
          }
        }
      })
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const { startStream, loading } = useJsonStream({
    schema: z.object({
      nodes: z.array(z.custom<CourseNodeType>()),
      edges: z.array(z.custom<Edge>())
    }),
    onEnd: async ({ nodes, edges }) => {
      setNodes(prev => [...prev, ...nodes])
      setEdges(prev => [...prev, ...edges])
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
        nodeTypes={{
          semesterNode: SemesterNode,
          courseNode: CourseNode
        }}
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDrag={onNodeDrag}
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
