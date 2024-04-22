import { Node, NodeProps } from "reactflow"

import { getSemesterCode } from "@/lib/schedule/utils"
import { cn } from "@/lib/utils"

export type SemesterNodeData =
  | {
      semesterIndex: number
      currSemester: number
      startDate: string
    }
  | {
      transfer: true
    }

type SemesterNodeProps = NodeProps<SemesterNodeData>

export type SemesterNodeType = Node<SemesterNodeData>

export const SEMESTER_NODE_WIDTH = 290
export const SEMESTER_NODE_HEIGHT = 600

export const defaultSemesterNode: Partial<Node> = {
  draggable: false,
  selectable: false,
  type: "semesterNode" as const,
  className: `bg-card border border-border rounded-md`,
  style: {
    width: SEMESTER_NODE_WIDTH,
    height: SEMESTER_NODE_HEIGHT
  }
}

export function SemesterNode({ data }: SemesterNodeProps) {
  const taken = "semesterIndex" in data && data.semesterIndex < data.currSemester
  const isCurrSemester = "semesterIndex" in data && data.semesterIndex == data.currSemester
  let name
  if ("transfer" in data) {
    name = "Transfer Credits"
  } else {
    const code = getSemesterCode(data.semesterIndex, data.startDate)
    name = `${code.semester} ${code.year} ${
      taken ? "(Taken)"
      : isCurrSemester ? "(Current)"
      : ""
    }`
  }

  return (
    <div
      className={cn(
        "flex w-full h-full justify-center pt-2 font-semibold",
        taken ? "bg-muted text-muted-foreground" : ""
      )}
    >
      <p>{"transfer" in data ? `Transfer Credits` : `${name}`}</p>
    </div>
  )
}
