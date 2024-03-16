import { DAG } from "@ui/components/dag"
import { CourseNode, StudentProfile } from "@graph/types"
import { Edge, Node } from "reactflow"
import { SemesterNode, SemesterNodeType } from "./semester-node"
import { CourseNode as CustomCourseNode, CourseNodeType } from "./course-node"



const defaultSemesterNode = {
  draggable: false,
  type: "semesterNode",
  style: {
    backgroundColor: "aliceblue",
    borderRadius: "0.5rem",
    zIndex: 1,
    width: 175,
    height: 600,

  }
}


export function SemesterDAG({ studentProfile: {
  graph, semesters, transferCredits, allCourses
} }: { studentProfile: StudentProfile }) {

  const nodes: Node[] = []
  const parentNodes: SemesterNodeType[] = semesters.map((_semester, index) => {
    return {
      ...defaultSemesterNode,
      id: `semester-${index}`,
      position: { x: index * 200, y: 0 },
      data: { semester: index },
    }
  })

  nodes.push(...parentNodes)

  const childNodes: CourseNodeType[] = semesters.map((semester, semIndex) => (
    semester.map(
      (course, courseIndex): Node => {
        return {
          id: `${course.id}`,
          parentNode: `semester-${semIndex}`,
          type: "courseNode",
          position: { x: 0, y: 50 + courseIndex * 50 },
          data: { semesterIndex: semIndex + 1, ...course },
          style: {
            backgroundColor: "aliceblue",
            borderRadius: "0.5rem",
            border: "1px solid black",
            width: "auto",
            zIndex: 2,
            height: "auto"
          },
        }
      })
  )).flat()

  nodes.push(...childNodes)



  const edges: Edge[] = allCourses.flatMap(course => {
    return (
      course.prerequisites
        //we only need to render the edges when the prereq course is also going to be rendered
        .filter(prereq => [...graph.values()].find(node => node.id === prereq))
        .map(prereq => {
          return {
            id: `${prereq}-${course.id}`,
            type: "default",
            source: prereq,
            target: course.id,
            zIndex: 2
          }
        })
    )
  })


  return (
    <div style={{ width: "100vw", height: "90vh" }}>
      <DAG customNodes={{
        "semesterNode": SemesterNode,
        "courseNode": CustomCourseNode
      }} nodes={nodes} edges={edges} />
    </div>
  )
}
