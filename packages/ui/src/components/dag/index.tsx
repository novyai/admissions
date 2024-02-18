"use client"

import ReactFlow from "reactflow"

import "reactflow/dist/style.css"

interface Node {
  id: string
  label: string
}

interface Edge {
  source: string
  target: string
}

export function DAG({ nodes, edges }: { nodes: Node[]; edges: Edge[] }) {
  const reactFlowNodes = nodes.map(node => ({
    id: node.id,
    position: { x: 0, y: 0 },
    data: { label: node.label }
  }))
  const reactFlowEdges = edges.map(edge => ({
    id: edge.source + edge.target,
    source: edge.source,
    target: edge.target
  }))

  return <ReactFlow nodes={reactFlowNodes} edges={reactFlowEdges} />
}
