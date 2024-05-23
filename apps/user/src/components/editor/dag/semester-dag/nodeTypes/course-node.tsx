"use client"

import { useContext } from "react"
import { CourseNode as CourseNodeGraphType } from "@repo/graph/types"
import { cn } from "@ui/lib/utils"
import { motion } from "framer-motion"
import { Handle, Node, NodeProps, Position, useUpdateNodeInternals } from "reactflow"

import { CourseContext } from "@/components/editor/editor"

export type CourseNodeData = {
  semesterIndex: number
  taken?: boolean
  pulsing: boolean
} & CourseNodeGraphType

export type CourseNodeType = Node<CourseNodeData>

export const defaultCourseNode: Partial<Node> = {
  type: "courseNode" as const
  // extent: 'parent'
}

export function CourseNode({ id, data, selected, dragging }: NodeProps<CourseNodeData>) {
  const updateNodeInternals = useUpdateNodeInternals()

  const { colorMap } = useContext(CourseContext)

  return (
    <motion.div
      className={cn(
        `max-w-[275px] border rounded-lg px-2 py-1 -1`,
        colorMap.get(data?.requirements?.[0] ?? "") ?? "bg-gray-200",
        (selected || dragging) && "border-ring z-20",
        data.taken ? "bg-muted border-2 border-muted-foreground-75 text-muted-foreground" : ""
      )}
      layout={!dragging}
      // create new component when animated changes, see issue workaround https://github.com/framer/motion/issues/2238#issue-1809290539
      key={id}
      onLayoutAnimationComplete={() => updateNodeInternals(id)}
    >
      <Handle type="target" position={Position.Left} />
      <p className="text-ellipsis text-center text-nowrap overflow-hidden">{data.name}</p>
      <Handle type="source" position={Position.Right} />
    </motion.div>
  )
}
