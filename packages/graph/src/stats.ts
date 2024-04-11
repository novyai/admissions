import { forEachTopologicalGeneration } from "graphology-dag"
import { reverse } from "graphology-operators"

import { CourseGraph } from "./course"
import { BaseStudentProfile } from "./types"

export function computeNodeStats(graph: CourseGraph, profile: BaseStudentProfile) {
  let semester = 1
  forEachTopologicalGeneration(graph, coursesInGeneration => {
    coursesInGeneration.forEach(courseId => {
      if (semester === 1) {
        calculateFanOut(graph, courseId)
      }
      graph.setNodeAttribute(courseId, "earliestFinish", semester)
    })
    semester += 1
  })

  semester = profile.timeToGraduate
  forEachTopologicalGeneration(reverse(graph), coursesInGeneration => {
    coursesInGeneration.forEach(courseId => {
      graph.setNodeAttribute(courseId, "latestFinish", semester)
      graph.setNodeAttribute(
        courseId,
        "slack",
        semester - (graph.getNodeAttribute(courseId, "earliestFinish") ?? 0)
      )
    })

    semester -= 1
  })
}
/**
 * Calculates the number of courses that are are dependent on the given course, including dependents of dependents
 * @param graph
 * @param courseId
 * @returns
 */
function calculateFanOut(graph: CourseGraph, courseId: string): number {
  const fanOut = graph
    .mapOutboundNeighbors(courseId, dependingCourseId => {
      return calculateFanOut(graph, dependingCourseId) + 1
    })
    .reduce((acc, val) => acc + val, 0)
  graph.setNodeAttribute(courseId, "fanOut", fanOut)
  return fanOut
}
