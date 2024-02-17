"use client"

import { HydratedCourse } from "@/types"
import ReactFlow from "reactflow"

import "reactflow/dist/style.css"

export function CoursesGraph({ courses }: { courses: HydratedCourse[] }) {
  let offset = 0
  const nodes = []
  for (const course of courses) {
    nodes.push({
      id: course.id,
      position: { x: offset, y: offset },
      data: { label: course.name }
    })
    offset += 100
  }

  const edges = courses.flatMap(course =>
    course.prerequisites.map(prereq => ({
      id: `${course.id}-${prereq}`,
      source: course.id,
      target: prereq.id
    }))
  )

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <ReactFlow nodes={nodes} edges={edges} />
    </div>
  )
}
