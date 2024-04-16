import { Handle, Node, NodeProps, Position } from "reactflow"

import { cn } from "@/lib/utils"

import { CourseNodeData } from "./course-node"

export const defaultGhostCourseNode: Partial<Node> = {
  draggable: false,
  selectable: false,
  type: "ghostCourseNode" as const
}

type GhostCourseNodeData = CourseNodeData

export type GhostCourseNodeType = Node<GhostCourseNodeData>

export function GhostCourseNode({ data }: NodeProps<CourseNodeData>) {
  return (
    <div className={cn("border rounded-md px-2 py-1 bg-muted  opacity-50")}>
      <Handle type="target" position={Position.Left} />
      <p className="text-ellipsis text-center">{data.name}</p>
      <Handle type="source" position={Position.Right} />
    </div>
  )
}
