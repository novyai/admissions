"use client"

import dagre from "dagre"
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  NodeProps,
  Position,
  Edge as ReactFlowEdge,
  Node as ReactFlowNode,
  useEdgesState,
  useNodesState
} from "reactflow"

import "reactflow/dist/style.css"

const dagreGraph = new dagre.graphlib.Graph()
export interface Node {
  id: string
  label: string
}

export interface Edge {
  source: string
  target: string
}

export function LayoutedDAG({ nodes, edges }: { nodes: Node[]; edges: Edge[] }) {
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

export function DAG({
  nodes: initialNodes,
  edges: initialEdges,
  customNodes = {}
}: {
  nodes: ReactFlowNode[]
  edges: ReactFlowEdge[]
  customNodes?: Record<string, React.ComponentType<NodeProps>>
}) {
  const [nodes, _setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, _setEdges, onEdgesChange] = useEdgesState(initialEdges)

  return (
    <ReactFlow
      nodeTypes={customNodes}
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
    >
      <Background />
      <MiniMap />
      <Controls />
    </ReactFlow>
  )
}
