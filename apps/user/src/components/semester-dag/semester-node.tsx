import { Node, NodeProps } from "reactflow"

export type SemesterNodeData =
  | {
      semesterIndex: number
    }
  | {
      transfer: true
    }

type SemesterNodeProps = NodeProps<SemesterNodeData>

export type SemesterNodeType = Node<SemesterNodeData>

export const SEMESTER_NODE_WIDTH = 275
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
  return (
    <div className="flex w-full h-full justify-center pt-2">
      <p>{"transfer" in data ? `Transfer Credits` : `Semester ${data.semesterIndex}`}</p>
    </div>
  )
}
