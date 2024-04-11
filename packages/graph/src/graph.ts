import {
  BaseStudentProfile,
  CourseNode,
  HydratedStudentProfile,
  StudentProfile
} from "@graph/types"
import Graph from "graphology"

import { CourseGraph } from "./course"
import { toCourseNode } from "./profile"
import { computeNodeStats } from "./stats"

export function studentProfileToGraph(profile: StudentProfile): CourseGraph {
  const graph: CourseGraph = new Graph()

  for (const courseNode of profile.semesters.flat()) {
    const sem = profile.semesters.findIndex(s => s.some(c => c.id === courseNode.id))
    graph.addNode(courseNode.id, {
      id: courseNode.id,
      name: courseNode.name,

      hasAttributes: false,
      fanOut: undefined,
      earliestFinish: undefined,
      latestFinish: undefined,
      slack: undefined,
      semester: sem
    })
  }

  for (const courseNode of profile.semesters.flat()) {
    for (const prereq of courseNode.prerequisites) {
      graph.addDirectedEdge(prereq, courseNode.id)
    }
  }

  computeNodeStats(graph, profile)

  return graph
}

export function graphToStudentProfile(
  graph: CourseGraph,
  profile: BaseStudentProfile
): HydratedStudentProfile {
  const allCourses: CourseNode[] = graph.mapNodes((courseId, course) =>
    toCourseNode(graph, courseId, course)
  )

  return {
    ...profile,
    // allCourses: allCourses,
    graph: allCourses.reduce(
      (acc, course) => acc.set(course.id, course),
      new Map<string, CourseNode>()
    ),
    semesters: buildSemesters(graph)
  }
}

export function buildSemesters(graph: Graph) {
  const semesters = graph
    .mapNodes((courseId, course) => toCourseNode(graph, courseId, course))
    .reduce((acc: CourseNode[][], course: CourseNode) => {
      const semesterIndex: number = graph.getNodeAttribute(course.id, "semester")
      if (semesterIndex in acc) {
        acc[semesterIndex].push(course)
        return acc
      }

      while (acc.length < semesterIndex) {
        acc.push([])
      }

      // courses with a semesterIndex of 0 are already completed
      acc[semesterIndex] = acc[semesterIndex] || []
      acc[semesterIndex]?.push(course)

      return acc
    }, [])
  return semesters
}

export const getAllPrereqs = (courseId: string, profile: StudentProfile): CourseNode[] => {
  const graph = studentProfileToGraph(profile)

  return _getAllPrereqs(courseId, graph).map(prereqId => toCourseNode(graph, prereqId, undefined))
}

export function _getAllPrereqs(courseId: string, graph: CourseGraph): string[] {
  const prereqs = graph.inNeighbors(courseId)
  return [...prereqs, ...prereqs.flatMap(p => _getAllPrereqs(p, graph))]
}

export const getAllDependents = (courseId: string, profile: StudentProfile): CourseNode[] => {
  const graph = studentProfileToGraph(profile)

  return _getAllDependents(courseId, graph).map(prereqId =>
    toCourseNode(graph, prereqId, undefined)
  )
}

export function _getAllDependents(courseId: string, graph: CourseGraph): string[] {
  const prereqs = graph.outNeighbors(courseId)
  return [...prereqs, ...prereqs.flatMap(p => _getAllDependents(p, graph))]
}
