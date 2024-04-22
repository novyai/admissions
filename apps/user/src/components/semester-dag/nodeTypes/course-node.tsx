"use client"

import { CourseNode as CourseNodeGraphType } from "@repo/graph/types"
import { cn } from "@ui/lib/utils"
import { Handle, Node, NodeProps, Position } from "reactflow"

export type CourseNodeData = {
  semesterIndex: number
  taken?: boolean
} & CourseNodeGraphType

export type CourseNodeType = Node<CourseNodeData>

export const defaultCourseNode: Partial<Node> = {
  type: "courseNode" as const
  // extent: 'parent'
}

export function CourseNode({ data, selected, dragging }: NodeProps<CourseNodeData>) {
  return (
    <div
      className={cn(
        "border rounded-lg px-2 py-1 -1",
        (selected || dragging) && "border-ring",
        data.taken ? "bg-muted border-2 border-muted-foreground-75 text-muted-foreground" : ""
      )}
    >
      <Handle type="target" position={Position.Left} />
      <p className="text-ellipsis text-center">{data.name}</p>
      <Handle type="source" position={Position.Right} />
    </div>
  )
}
