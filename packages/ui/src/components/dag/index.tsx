"use client"

import dagre from "dagre"
import ReactFlow, { Background, Position, Node as ReactFlowNode } from "reactflow"

import "reactflow/dist/style.css"

const dagreGraph = new dagre.graphlib.Graph()
interface Node {
  id: string
  label: string
}

interface Edge {
  source: string
  target: string
}

export function DAG({ nodes, edges }: { nodes: Node[]; edges: Edge[] }) {
  // render horizontally
  dagreGraph.setGraph({ rankdir: "LR" })
  // no edge labels
  dagreGraph.setDefaultEdgeLabel(() => ({}))

  const reactFlowEdges = edges.map(edge => ({
    id: edge.source + edge.target,
    source: edge.source,
    target: edge.target
  }))

  reactFlowEdges.forEach(edge => {
    dagreGraph.setEdge(edge.source, edge.target)
  })

  nodes.forEach(node => {
    dagreGraph.setNode(node.id, { width: 200, height: 200 })
  })

  dagre.layout(dagreGraph)

  const reactFlowNodes: ReactFlowNode[] = nodes.map(node => {
    const layout = dagreGraph.node(node.id)
    return {
      id: node.id,
      data: { label: node.label },
      targetPosition: Position.Left,
      sourcePosition: Position.Right,
      position: {
        x: layout.x,
        y: layout.y
      }
    }
  })

  return (
    <ReactFlow nodes={reactFlowNodes} edges={reactFlowEdges}>
      <Background />
    </ReactFlow>
  )
}
