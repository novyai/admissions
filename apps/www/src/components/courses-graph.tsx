"use client"

import { HydratedCourse } from "@/types"
import { DAG } from "@ui/components/dag"

import "reactflow/dist/style.css"

export function CoursesGraph({ courses }: { courses: HydratedCourse[] }) {
  const nodes = courses.map(course => ({
    id: course.id,
    label: course.name
  }))

  const edges = courses.flatMap(course =>
    course.prerequisites.map(prereq => ({
      source: course.id,
      target: prereq.id
    }))
  )

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <DAG nodes={nodes} edges={edges} />
    </div>
  )
}
