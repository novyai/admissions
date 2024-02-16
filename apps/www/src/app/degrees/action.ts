"use server"

import { getDegreeData } from "@/db/degree"
import {
  calculateEarliestFinish,
  calculateFanOut,
  calculateLatestFinish,
  CourseNode,
  StudentProfile
} from "@/db/graph"

export const getDegree = async (profile: StudentProfile) => {
  const { prereqMap, dependentMap, allCourses } = await getDegreeData([
    {
      id: {
        in: profile.requiredCourses
      }
    }
  ])

  const graph = new Map<string, CourseNode>()

  for (const course of allCourses) {
    graph.set(course.id, {
      id: course.id,
      earliestFinish: undefined,
      latestFinish: undefined,
      dependents: Array.from(new Set(dependentMap.get(course.id) ?? [])),
      prerequisites: Array.from(new Set(prereqMap.get(course.id) ?? [])),
      name: course.name
    })
  }

  for (const course of allCourses) {
    calculateFanOut(course.id, graph)
    calculateEarliestFinish(course.id, graph, profile)
    calculateLatestFinish(course.id, graph, profile)
  }

  return graph
}
