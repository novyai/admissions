import { graphToHydratedStudentProfile, studentProfileToGraph } from "@graph/graph"
import { HydratedStudentProfile } from "@graph/types"

import { CourseGraph } from "./course"

export type CannotMoveReason = {
  reason:
    | {
        type: "prereq" | "dependent"
        courseId: string[]
      }
    | { type: "graduation" }
    | {
        type: "full"
        semesterIndex: number
      }
    | { type: "not-found-in-schedule" }

  canMove: false
}

/**
 * Checks if a course can be moved to a different semester without violating prerequisites and graduation time.
 * @param courseId The ID of the course to move.
 * @param toSemester The target semester index to move the course to.
 * @param profile The student's profile with a vaild schedule.
 * @returns {boolean} True if the course can be moved, false otherwise.
 */
export function canMoveCourse(
  courseId: string,
  toSemester: number,
  profile: HydratedStudentProfile,
  ignoreGraduation: boolean = false
): CannotMoveReason | { canMove: true } {
  if (!ignoreGraduation && toSemester >= profile.timeToGraduate) {
    return {
      canMove: false,
      reason: { type: "graduation" }
    }
  }

  if (
    toSemester in profile.semesters &&
    profile.semesters[toSemester - 1] &&
    profile.semesters[toSemester]!.length >= profile.coursePerSemester
  ) {
    return {
      canMove: false,
      reason: {
        type: "full",
        semesterIndex: toSemester
      }
    }
  }

  const graph: CourseGraph = studentProfileToGraph(profile)
  return _canMoveCourse(courseId, toSemester, graph)
}

export function _canMoveCourse(
  courseId: string,
  toSemester: number,
  graph: CourseGraph
): CannotMoveReason | { canMove: true } {
  // Does the course exist in the profile?
  const fromSemester = graph.getNodeAttributes(courseId).semester

  // Ensure the course exists in the fromSemester
  if (fromSemester === undefined) {
    return { canMove: false, reason: { type: "not-found-in-schedule" } }
  }

  // Check if moving the course violates any prerequisite requirements. Only need to check the direct
  // prereqs because we assume that the current schedule is valid
  const allPrerequestNotCompletedBefore = graph
    .mapInNeighbors(courseId, (_prereqId, prereq) => prereq)
    .filter(prereq => prereq.semester && prereq.semester >= toSemester)

  if (allPrerequestNotCompletedBefore.length > 0) {
    return {
      canMove: false,

      reason: {
        type: "prereq",
        courseId: allPrerequestNotCompletedBefore.map(prereq => prereq.id)
      }
    }
  }

  // Find all courses that list the moving course as a prerequisite
  const allDependentsNotCompletedAfter = graph
    .mapOutNeighbors(courseId, (_dependentId, dependent) => dependent)
    .filter(dependent => dependent.semester && dependent.semester <= toSemester)

  if (allDependentsNotCompletedAfter.length > 0) {
    return {
      canMove: false,
      reason: {
        type: "dependent",
        courseId: allDependentsNotCompletedAfter.map(dependent => dependent.id)
      }
    }
  }

  return { canMove: true }
}

export function moveCourse(courseId: string, toSemester: number, profile: HydratedStudentProfile) {
  const graph: CourseGraph = studentProfileToGraph(profile)
  const canMove = _canMoveCourse(courseId, toSemester, graph)
  if (canMove) {
    graph.setNodeAttribute(courseId, "semester", toSemester)
    return graphToHydratedStudentProfile(graph, profile)
  }
  return profile
}
