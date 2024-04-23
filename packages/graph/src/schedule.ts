import { graphToHydratedStudentProfile, studentProfileToGraph } from "@graph/graph"
import { HydratedStudentProfile } from "@graph/types"
import { RequirementType } from "@repo/db"

import { CourseGraph } from "./course"

export type CannotMoveReason = {
  reason:
    | {
        type: "prerequisite" | "dependent"
        corequisite: boolean
        courseId: string[]
      }
    | { type: "graduation" }
    | {
        type: "full"
        semesterIndex: number
      }
    | { type: "not-found-in-schedule" }
    | { type: "semester-already-taken"; semesterIndex: number }

  canMove: false
}

type CanMoveReturn = CannotMoveReason | { canMove: true }

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
  ignoreGraduation: boolean = true
): CannotMoveReason | { canMove: true } {
  if (toSemester < profile.currSemester) {
    return {
      canMove: false,
      reason: { type: "semester-already-taken", semesterIndex: toSemester }
    }
  }

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

/**
 * Checks for prerequisites not completed before the target semester.
 * @param courseId The ID of the course to move.
 * @param toSemester The target semester.
 * @param graph The course graph.
 * @returns An array of prerequisite course IDs not completed before the target semester.
 */
function checkDependents(courseId: string, toSemester: number, graph: CourseGraph): string[] {
  return graph
    .mapInNeighbors(courseId, (_prereqId, prereq) => prereq)
    .filter(
      prereq =>
        graph.getEdgeAttribute(prereq.id, courseId, "type") === RequirementType.PREREQUISITE &&
        prereq.semester &&
        prereq.semester >= toSemester
    )
    .map(prereq => prereq.id)
}

/**
 * Checks for dependent courses not completed after the given semester.
 * @param courseId The ID of the course to move.
 * @param toSemester The target semester.
 * @param graph The course graph.
 * @returns An array of dependent course IDs not completed after the target semester.
 */
function checPrereqs(courseId: string, toSemester: number, graph: CourseGraph): string[] {
  return graph
    .mapOutNeighbors(courseId, (_dependentId, dependent) => dependent)
    .filter(
      dependent =>
        graph.getEdgeAttribute(courseId, dependent.id, "type") === RequirementType.PREREQUISITE &&
        dependent.semester &&
        dependent.semester <= toSemester
    )
    .map(dependent => dependent.id)
}

/**
 * Checks if a course is a corequisite of another course and if so, checks if the main course can be moved to the target semester.
 * @param courseId The ID of the course to move.
 * @param toSemester The target semester.
 * @param graph
 * @returns
 */
function checkCorequisiteRequirements(
  courseId: string,
  toSemester: number,
  graph: CourseGraph
): CanMoveReturn {
  // if its a corequistite of another course check those courses prereqs

  // get the main course
  const mainCourse = graph
    .mapInNeighbors(courseId, (_coreqId, coreq) => coreq)
    .find(
      coreq => graph.getEdgeAttribute(coreq.id, courseId, "type") === RequirementType.COREQUISITE
    )

  if (!mainCourse)
    return {
      canMove: true
    }

  // check if we could move the main course to the target semester
  const canMoveMainCourse = _canMoveCourse(mainCourse.id, toSemester, graph)
  if (!canMoveMainCourse.canMove) {
    return {
      canMove: false,
      reason:
        (
          canMoveMainCourse.reason.type === "semester-already-taken" ||
          canMoveMainCourse.reason.type === "not-found-in-schedule" ||
          canMoveMainCourse.reason.type === "full" ||
          canMoveMainCourse.reason.type === "graduation"
        ) ?
          canMoveMainCourse.reason
        : {
            ...canMoveMainCourse.reason,
            corequisite: true
          }
    }
  } else {
    return canMoveMainCourse
  }
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

export function _canMoveCourse(
  courseId: string,
  toSemester: number,
  graph: CourseGraph
): CanMoveReturn {
  // Does the course exist in the profile?
  const fromSemester = graph.getNodeAttributes(courseId).semester

  // Ensure the course exists in the fromSemester
  if (fromSemester === undefined) {
    return { canMove: false, reason: { type: "not-found-in-schedule" } }
  }

  const req = checkCorequisiteRequirements(courseId, toSemester, graph)
  if (!req.canMove) {
    return req
  }

  // Find all courses that list the moving course as a prerequisite
  const failedPre = checPrereqs(courseId, toSemester, graph)
  if (failedPre.length > 0)
    return {
      canMove: false,
      reason: {
        corequisite: false,
        type: "prerequisite",
        courseId: failedPre
      }
    }

  const failedDep = checkDependents(courseId, toSemester, graph)
  if (failedDep.length > 0)
    return {
      canMove: false,
      reason: {
        corequisite: false,
        type: "dependent",
        courseId: failedDep
      }
    }
  return { canMove: true }
}
