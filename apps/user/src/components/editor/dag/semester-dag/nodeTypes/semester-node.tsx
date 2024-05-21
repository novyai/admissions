import { SemesterYearType } from "@graph/types"
import { Node, NodeProps } from "reactflow"

import { getSemesterCode } from "@/lib/schedule/utils"
import { capitalize, cn } from "@/lib/utils"

export type SemesterNodeData =
  | {
      semesterIndex: number
      currSemester: number
      startTerm: SemesterYearType
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
  const completed = "semesterIndex" in data && data.semesterIndex < data.currSemester
  const isCurrSemester = "semesterIndex" in data && data.semesterIndex == data.currSemester
  let name
  if ("transfer" in data) {
    name = "Transfer Credits"
  } else {
    const code = getSemesterCode(data.semesterIndex, data.startTerm)
    name = `${capitalize(code.semester)} ${code.year} ${
      completed ? "(Completed)"
      : isCurrSemester ? "(Current)"
      : ""
    }`
  }

  return (
    <div
      className={cn(
        "flex w-full h-full justify-center pt-2 font-semibold",
        completed ? "bg-muted text-muted-foreground" : ""
      )}
    >
      <p>{"transfer" in data ? `Transfer Credits` : `${name}`}</p>
    </div>
  )
}
