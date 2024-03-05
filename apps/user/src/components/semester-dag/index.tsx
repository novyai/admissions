import { CourseNode } from "@graph/types"
import { DAG } from "@ui/components/dag"
import { Edge, Node } from "reactflow"
import { SemesterNode } from "./semester-node"

export function SemesterDAG({ graph, semesters }: { graph: Map<string, CourseNode>, semesters: CourseNode[][] }) {
  const parentNodes: Node[] = semesters.map((_semester, index) => {
    return {
      id: `semester-${index}`,
      type: "semesterNode",
      position: { x: index * 200, y: 0 },
      data: { semester: index },
      style: {
        backgroundColor: "aliceblue",
        borderRadius: "0.5rem",
        width: 175,
        height: 600
      }
    }
  })

  const childNodes: Node[] = semesters.map((semester, semIndex) => (
    semester.map(
      (course, courseIndex): Node => {
        return {
          id: `${course.id}-${semIndex}-${courseIndex}`,
          parentNode: `semester-${semIndex}`,
          position: { x: 0, y: 50 + courseIndex * 30 },
          data: { label: course.name },
          style: {
            backgroundColor: "aliceblue",
            borderRadius: "0.5rem",
          },
          extent: "parent"
        }
      })
  )).flat()


  const edges: Edge[] = []


  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <DAG customNodes={{
        "semesterNode": SemesterNode,
        "courseNode": CourseNode
      }} nodes={[...parentNodes, ...childNodes]} edges={edges} />
    </div>
  )
}
