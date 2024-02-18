"use client"

import { HydratedCourse } from "@/types"
import { DAG } from "@ui/components/dag"

import "reactflow/dist/style.css"

export function CoursesGraph({ courses }: { courses: HydratedCourse[] }) {
  const nodes = courses.map(course => ({
    id: course.id,
    label: course.name
  }))

  const edges = courses.flatMap(course => {
    return (
      course.prerequisites
        //we only need to render the edges when the prereq course is also going to be rendered
        .filter(prereq => nodes.find(node => node.id === prereq.id))
        .map(prereq => {
          return {
            source: prereq.id,
            target: course.id
          }
        })
    )
  })

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <DAG nodes={nodes} edges={edges} />
    </div>
  )
}
