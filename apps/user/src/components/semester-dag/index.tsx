import { CourseNode as CourseNodeType } from "@graph/types"
import { DAG } from "@ui/components/dag"
import { Edge, Node } from "reactflow"
import { SemesterNode } from "./semester-node"
import { CourseNode } from "./course-node"

export function SemesterDAG({ graph, semesters }: { graph: Map<string, CourseNodeType>, semesters: CourseNodeType[][] }) {
  const parentNodes: Node[] = semesters.map((_semester, index) => {
    return {
      id: `semester-${index}`,
      type: "semesterNode",
      position: { x: index * 200, y: 0 },
      data: { semester: index },
      draggable: false,
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
          id: `${course.id}`,
          parentNode: `semester-${semIndex}`,
          type: "courseNode",
          position: { x: 0, y: 50 + courseIndex * 30 },
          data: { semesterIndex: semIndex, ...course },
          style: {
            backgroundColor: "aliceblue",
            borderRadius: "0.5rem",
            border: "1px solid black"
          },
          extent: "parent"
        }
      })
  )).flat()

  const courses = Array.from(graph.values())


  const edges: Edge[] = courses.flatMap(course => {
    return (
      course.prerequisites
        //we only need to render the edges when the prereq course is also going to be rendered
        .filter(prereq => courses.find(node => node.id === prereq))
        .map(prereq => {
          return {
            tyoe: "smoothstep",
            source: prereq,
            target: course.id
          }
        })
    )
  })


  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <DAG customNodes={{
        "semesterNode": SemesterNode,
        "courseNode": CourseNode
      }} nodes={[...parentNodes, ...childNodes]} edges={edges} />
    </div>
  )
}