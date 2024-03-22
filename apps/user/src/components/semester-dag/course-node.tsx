"use client"

import { CourseNode as CourseNodeGraphType } from "@repo/graph/types"
import { Handle, Node, NodeProps, Position } from "reactflow"

export type CourseNodeData = {
  semesterIndex: number
} & CourseNodeGraphType

export type CourseNodeType = Node<CourseNodeData>

export function CourseNode({ data }: NodeProps<CourseNodeData>) {
  return (
    <div className="mx-2 my-1 -1">
      <Handle type="target" position={Position.Left} />
      <p className="text-ellipsis text-center">{data.name}</p>
      <Handle type="source" position={Position.Right} />
    </div>
  )
}
