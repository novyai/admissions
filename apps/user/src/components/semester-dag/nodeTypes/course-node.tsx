"use client"

import { Program, ProgramOption } from "@graph/defaultCourses"
import { CourseNode as CourseNodeGraphType } from "@repo/graph/types"
import { cn } from "@ui/lib/utils"
import { motion } from "framer-motion"
import { Handle, Node, NodeProps, Position } from "reactflow"

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

type KEYS = Program | "EXTRA"
const colorsForPrograms: { [key in KEYS]?: string } = {
  [ProgramOption.CS]: "bg-sky-200",
  [ProgramOption.GEN]: "bg-yellow-200",
  ["EXTRA"]: "bg-green-200"
}

export function CourseNode({ id, data, selected, dragging }: NodeProps<CourseNodeData>) {
  return (
    <motion.div
      className={cn(
        "border rounded-lg px-2 py-1 -1",
        (selected || dragging) && "border-ring z-20",
        data.taken ? "bg-muted border-2 border-muted-foreground-75 text-muted-foreground" : "",
        data.programs && data.programs[0] ?
          colorsForPrograms[data.programs[0]]
        : colorsForPrograms["EXTRA"]
      )}
      layout
      animate={dragging && selected}
      // create new component when animated changes, see issue workaround https://github.com/framer/motion/issues/2238#issue-1809290539
      key={id}
    >
      <Handle type="target" position={Position.Left} />
      <p className="text-ellipsis text-center">
        {data.name} - {data.programs}
      </p>
      <Handle type="source" position={Position.Right} />
    </motion.div>
  )
}
