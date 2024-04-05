import { graphtoStudentProfile, studentProfileToGraph } from "@graph/graph"
import { StudentProfile } from "@graph/types"

import { CourseGraph } from "./profile"

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
  profile: StudentProfile
): { canMove: false; reason: string } | { canMove: true } {
  if (toSemester >= profile.timeToGraduate) {
    return {
      canMove: false,
      reason: "Cannot move course beyond the student's time to graduate."
    }
  }

  if (
    profile.semesters[toSemester - 1] &&
    profile.semesters[toSemester]!.length >= profile.coursePerSemester
  ) {
    return {
      canMove: false,
      reason: `Semester ${toSemester} is full.`
    }
  }

  const graph: CourseGraph = studentProfileToGraph(profile)
  return _canMoveCourse(courseId, toSemester, graph)
}

function _canMoveCourse(
  courseId: string,
  toSemester: number,
  graph: CourseGraph
): { canMove: false; reason: string } | { canMove: true } {
  // Does the course exist in the profile?
  const fromSemester = graph.getNodeAttributes(courseId).semester

  // Ensure the course exists in the fromSemester
  if (fromSemester === undefined) {
    return { canMove: false, reason: "Course not found in the student's schedule." }
  }

  // Check if moving the course violates any prerequisite requirements. Only need to check the direct
  // prereqs because we assume that the current schedule is valid
  const allPrerequestNotCompletedBefore = graph
    .mapInNeighbors(courseId, (_prereqId, prereq) => prereq)
    .filter(prereq => prereq.semester && prereq.semester >= toSemester)

  if (allPrerequestNotCompletedBefore.length > 0) {
    return {
      canMove: false,
      reason: `Course ${courseId} cannot be moved to semester ${toSemester} because the following prerequisites are not met: ${allPrerequestNotCompletedBefore.map(
        prereq => `\n- ${prereq.name}`
      )}.`
    }
  }

  // Find all courses that list the moving course as a prerequisite
  const allDependentsNotCompletedAfter = graph
    .mapOutNeighbors(courseId, (_dependentId, dependent) => dependent)
    .filter(dependent => dependent.semester && dependent.semester <= toSemester)

  if (allDependentsNotCompletedAfter.length > 0) {
    return {
      canMove: false,
      reason: `Course ${courseId} cannot be moved to semester ${toSemester} because the following dependent courses' prerequisites would no longer be met: ${allDependentsNotCompletedAfter.map(
        dependent => `\n- ${dependent.name}`
      )}.`
    }
  }

  return { canMove: true }
}

export function moveCourse(courseId: string, toSemester: number, profile: StudentProfile) {
  const graph: CourseGraph = studentProfileToGraph(profile)
  const canMove = _canMoveCourse(courseId, toSemester, graph)
  if (canMove) {
    graph.setNodeAttribute(courseId, "semester", toSemester)
    return graphtoStudentProfile(graph, profile)
  }
  return profile
}
