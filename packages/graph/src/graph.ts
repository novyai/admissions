import { BaseStudentProfile, CourseNode, HydratedStudentProfile } from "@graph/types"
import { Change, ChangeType } from "@repo/constants"
import { RequirementType } from "@repo/db"
import Graph from "graphology"

import { CourseGraph } from "./course"
import { toCourseNode } from "./profile"
import { computeNodeStats } from "./stats"

export const getCoursesInSemester = (graph: CourseGraph, semester: number) => {
  const courses = [...graph.nodeEntries()].map(entry => entry.attributes)
  return courses.filter(c => c.semester === semester)
}

export const getChangesBetweenGraphs = (oldGraph: CourseGraph, newGraph: CourseGraph): Change[] => {
  const changes: Change[] = []

  for (const newNodeEntry of newGraph.nodeEntries()) {
    const newSemester = newNodeEntry.attributes.semester
    const oldSemester = oldGraph.getNodeAttribute(newNodeEntry.node, "semester")

    if (newSemester !== undefined && newSemester !== oldSemester) {
      changes.push({
        type: ChangeType.Move,
        courseId: newNodeEntry.node,
        semester: newSemester
      })
    }
  }

  return changes
}

export const getCorequisites = (graph: CourseGraph, courseID: string) =>
  graph
    .filterInEdges(courseID, (_, edge) => edge.type === RequirementType.COREQUISITE)
    .map(edgeId => graph.source(edgeId))
    .map(nodeId => graph.getNodeAttributes(nodeId))

export function hydratedStudentProfileToGraph(profile: HydratedStudentProfile): CourseGraph {
  const graph: CourseGraph = new Graph()

  for (const courseNode of profile.semesters.flat()) {
    const sem = profile.semesters.findIndex(s => s.some(c => c.id === courseNode.id))
    graph.addNode(courseNode.id, {
      id: courseNode.id,
      name: courseNode.name,
      tracks: courseNode.tracks,
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
      graph.addDirectedEdge(prereq, courseNode.id, {
        type: RequirementType.PREREQUISITE
      })
    }
    for (const coreq of courseNode.corequisites) {
      graph.addDirectedEdge(courseNode.id, coreq, {
        type: RequirementType.COREQUISITE
      })
    }
  }

  computeNodeStats(graph, profile)

  return graph
}

export function hydratedProfileToBaseStudentProfile(
  hydratedProfile: HydratedStudentProfile
): BaseStudentProfile {
  return {
    requiredCourses: hydratedProfile.requiredCourses,
    transferCredits: hydratedProfile.transferCredits,
    tracks: hydratedProfile.tracks,
    timeToGraduate: hydratedProfile.timeToGraduate,
    currentSemester: hydratedProfile.currentSemester,
    coursePerSemester: hydratedProfile.coursePerSemester,
    startTerm: hydratedProfile.startTerm,
    takenCourses: hydratedProfile.takenCourses
  }
}

export function graphToHydratedStudentProfile(
  graph: CourseGraph,
  courseToReqList: Map<string, string[]>,
  profile: BaseStudentProfile
): HydratedStudentProfile {
  const allCourses: CourseNode[] = graph.mapNodes((courseId, course) =>
    toCourseNode(graph, courseId, course)
  )

  return {
    ...profile,
    // allCourses: allCourses,
    courseToReqList: courseToReqList,
    graph: allCourses.reduce(
      (acc, course) => acc.set(course.id, course),
      new Map<string, CourseNode>()
    ),
    semesters: buildSemesters(graph)
  }
}

export function buildSemesters(graph: CourseGraph) {
  const semesters = graph
    .mapNodes((courseId, course) => toCourseNode(graph, courseId, course))
    .reduce((acc: CourseNode[][], course: CourseNode) => {
      const semesterIndex = graph.getNodeAttribute(course.id, "semester")!
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

// export const getUnusedCourses = () => {

// }

export const getAllPrereqs = (courseId: string, profile: HydratedStudentProfile): CourseNode[] => {
  const graph = hydratedStudentProfileToGraph(profile)

  return _getAllPrereqs(courseId, graph).map(prereqId => toCourseNode(graph, prereqId, undefined))
}

export function _getAllPrereqs(courseId: string, graph: CourseGraph): string[] {
  const prereqs = graph.inNeighbors(courseId)
  return [...prereqs, ...prereqs.flatMap(p => _getAllPrereqs(p, graph))]
}

export const getAllDependents = (
  courseId: string,
  profile: HydratedStudentProfile
): CourseNode[] => {
  const graph = hydratedStudentProfileToGraph(profile)

  return _getAllDependents(courseId, graph).map(prereqId =>
    toCourseNode(graph, prereqId, undefined)
  )
}

export function _getAllDependents(courseId: string, graph: CourseGraph): string[] {
  const prereqs = graph.outNeighbors(courseId)
  return [...prereqs, ...prereqs.flatMap(p => _getAllDependents(p, graph))]
}

export const _hasDependents = (courseId: string, graph: CourseGraph): boolean =>
  graph.outNeighbors(courseId).length > 0

export const getAllCourseIdsInSchedule = (profile: HydratedStudentProfile): string[] => {
  return profile.semesters.flatMap(sem => sem.map(courseNode => courseNode.id))
}
