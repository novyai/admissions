import { Node, NodeProps } from "reactflow"

export type SemesterNodeData =
  | {
      semester: number
    }
  | {
      transfer: true
    }

type SemesterNodeProps = NodeProps<SemesterNodeData>

export type SemesterNodeType = Node<SemesterNodeData>

export const defaultSemesterNode: Partial<Node> = {
  draggable: false,
  type: "semesterNode",
  style: {
    backgroundColor: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "0.5rem",
    zIndex: 1,
    width: 175,
    height: 600
  }
}

export const defaultCourseNode: Partial<Node> = {
  type: "courseNode",
  style: {
    backgroundColor: "hsl(var(--accent))",
    borderRadius: "0.5rem",
    border: "1px solid hsl(var(--border))",
    width: "auto",
    zIndex: 2,
    height: "auto"
  }
  // extent: 'parent'
}

export function SemesterNode({ data }: SemesterNodeProps) {
  return (
    <div className="flex w-full h-full justify-center pt-2">
      <p>{"transfer" in data ? `Transfer Credits` : `Semester ${data.semester}`}</p>
    </div>
  )
}
