import { CourseNode } from "@graph/types"
import { LayoutedDAG } from "@ui/components/dag"

export function CoursesGraph({ graph }: { graph: Map<string, CourseNode> }) {
  const courses = Array.from(graph.values())
  const nodes = courses.map(course => ({
    id: course.id,
    label: course.name
  }))

  const edges = courses.flatMap(course => {
    return (
      course.prerequisites
        //we only need to render the edges when the prereq course is also going to be rendered
        .filter(prereq => nodes.find(node => node.id === prereq))
        .map(prereq => {
          return {
            source: prereq,
            target: course.id
          }
        })
    )
  })

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <LayoutedDAG nodes={nodes} edges={edges} />
    </div>
  )
}
