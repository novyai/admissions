import { CourseNode, StudentProfile } from "@graph/types"
import { CourseGraph, computeNodeStats, toCourseNode } from "./profile"
import Graph from "graphology"

export function studentProfileToGraph(profile: StudentProfile) : CourseGraph {

  const graph : CourseGraph = new Graph()

  for (const courseNode of profile.allCourses) {
    graph.addNode(courseNode.id, {
      id: courseNode.id,
      courseSubject: courseNode.raw_course.courseSubject,
      courseNumber: courseNode.raw_course.courseNumber,
      name: courseNode.name,
      departmentId: courseNode.raw_course.departmentId,
      universityId: courseNode.raw_course.universityId,

      startTerm: null,
      endTerm: null, 

      hasAttributes: false,
      fanOut: undefined,
      earliestFinish: undefined,
      latestFinish: undefined,
      slack: undefined,

      //TODO: add semester
    })
  }

  for (const courseNode of profile.allCourses) {
    for (const prereq of courseNode.prerequisites) {
      graph.addDirectedEdge(prereq, courseNode.id)
    }
  }

  computeNodeStats(graph, profile)

  return graph
}

/**
 * Returns all of the courses that depend on the given course
 * @param course Course to get all required courses for
 * @param graph Map of all courses
 * @returns Array of all required courses for the given course
 */
export function getAllRequiredCourses(course: string, graph: Map<string, CourseNode>) {
  const requiredCourses = new Set<string>()

  const node = graph.get(course)
  if (!node) throw new Error("Course not found")
  requiredCourses.add(course)
  for (const prerequisite of node.prerequisites) {
    getAllRequiredCourses(prerequisite, graph).forEach(entry => {
      requiredCourses.add(entry)
    })
  }
  return [...requiredCourses.values()]
}

export const getAllPrereqs = (courseId: string, profile: StudentProfile): CourseNode[] => {
  const graph = studentProfileToGraph(profile)

  return _getAllPrereqs(courseId, graph)
    .map(prereqId => toCourseNode(graph, prereqId, undefined))
}

function _getAllPrereqs(courseId: string, graph: CourseGraph): string[] {
  const prereqs = graph.inNeighbors(courseId)
  return [...prereqs, ...prereqs.flatMap(p => _getAllPrereqs(p, graph))]
}

export const getAllDependents = (courseId: string, profile: StudentProfile): CourseNode[] => {
  const graph = studentProfileToGraph(profile)

  return _getAllDependents(courseId, graph)
    .map(prereqId => toCourseNode(graph, prereqId, undefined))
}

function _getAllDependents(courseId: string, graph: CourseGraph): string[] {
  const prereqs = graph.outNeighbors(courseId)
  return [...prereqs, ...prereqs.flatMap(p => _getAllDependents(p, graph))]
}
