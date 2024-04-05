import { BaseStudentProfile, CourseNode, StudentProfile } from "@graph/types"
import Graph from "graphology"

import { computeNodeStats, CourseGraph, toCourseNode } from "./profile"

export function studentProfileToGraph(profile: StudentProfile): CourseGraph {
  const graph: CourseGraph = new Graph()

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

      semester: profile.semesters.findIndex(s => s.some(c => c.id === courseNode.id))
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

export function graphtoStudentProfile(
  graph: CourseGraph,
  oldProfile: BaseStudentProfile
): StudentProfile {
  const allCourses: CourseNode[] = graph.mapNodes((courseId, course) =>
    toCourseNode(graph, courseId, course)
  )
  return {
    ...oldProfile,
    allCourses: allCourses,
    graph: allCourses.reduce(
      (acc, course) => acc.set(course.id, course),
      new Map<string, CourseNode>()
    ),
    semesters: buildSemesters(graph)
  }
}

function buildSemesters(graph: Graph): CourseNode[][] {
  const semesters: CourseNode[][] = graph
    .mapNodes((courseId, course) => toCourseNode(graph, courseId, course))
    .reduce((acc: CourseNode[][], course: CourseNode) => {
      const semesterIndex: number = graph.getNodeAttribute(course.id, "semester")
      if (semesterIndex > 0) {
        // courses with a semesterIndex of 0 are already completed
        acc[semesterIndex - 1] = acc[semesterIndex - 1] || []
        acc[semesterIndex - 1]?.push(course)
      }
      return acc
    }, [])
  return semesters
}

export const getAllPrereqs = (courseId: string, profile: StudentProfile): CourseNode[] => {
  const graph = studentProfileToGraph(profile)

  return _getAllPrereqs(courseId, graph).map(prereqId => toCourseNode(graph, prereqId, undefined))
}

function _getAllPrereqs(courseId: string, graph: CourseGraph): string[] {
  const prereqs = graph.inNeighbors(courseId)
  return [...prereqs, ...prereqs.flatMap(p => _getAllPrereqs(p, graph))]
}

export const getAllDependents = (courseId: string, profile: StudentProfile): CourseNode[] => {
  const graph = studentProfileToGraph(profile)

  return _getAllDependents(courseId, graph).map(prereqId =>
    toCourseNode(graph, prereqId, undefined)
  )
}

function _getAllDependents(courseId: string, graph: CourseGraph): string[] {
  const prereqs = graph.outNeighbors(courseId)
  return [...prereqs, ...prereqs.flatMap(p => _getAllDependents(p, graph))]
}
