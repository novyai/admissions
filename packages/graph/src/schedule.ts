import { getAllDependents, getAllRequiredCourses } from "@graph/graph"
import { CourseNode, StudentProfile } from "@graph/types"

import { getCourseFromIdNameCode } from "./course"

/**
 * Add a course to a semester, or a future semester if the current semester is full
 * @param course The course to add
 * @param semesters The schedule of semesters to add the course to
 * @param semester The semester index to add the course to
 */
export function addToSemester(
  course: CourseNode,
  semester: number,
  profile: StudentProfile,
  useCoursesPerSemester: boolean = true
) {
  if (semester >= profile.timeToGraduate || profile.semesters.length > profile.timeToGraduate) {
    throw new Error(
      `Can only have ${profile.timeToGraduate} semesters. have ${profile.semesters.length} (${semester})`
    )
  }
  if (profile.semesters[semester]) {
    if (
      useCoursesPerSemester &&
      profile.semesters[semester]?.length! >= profile.coursePerSemester
    ) {
      addToSemester(course, semester + 1, profile, useCoursesPerSemester)
    } else {
      profile.semesters[semester]?.push(course)
    }
  } else {
    profile.semesters.push([course])
  }
}

export function canMoveCourse2(
  courseId: string,
  toSemester: number,
  profile: StudentProfile
): { canMove: false, reason: string } | { canMove: true } {
  if (toSemester >= profile.timeToGraduate) {
    return {
      canMove: false,
      reason: "Cannot move course beyond the student's time to graduate."
    }
  }

  return { canMove: true }
}

/**
 * Checks if a course can be moved to a different semester without violating prerequisites and graduation time.
 * @param courseId The ID of the course to move.
 * @param toSemester The target semester index to move the course to.
 * @param profile The student's profile.
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

  // find course name in the graph:
  const course = getCourseFromIdNameCode(profile, courseId)
  if (!course) {
    return { canMove: false, reason: `Course ${courseId} not found in the student's schedule.` }
  }

  // Does the course exist in the profile?
  const fromSemester = profile.semesters.findIndex(s => s.some(c => c.id === course.id))

  // Ensure the course exists in the fromSemester
  if (fromSemester === -1) {
    return { canMove: false, reason: "Course not found in the student's schedule." }
  }

  // Check if moving the course violates any prerequisite requirements
  const coursePrerequisites = getAllRequiredCourses(course.id, profile.graph).filter(
    c => c !== course.id
  )

  const beforePrereqs: string[] = []
  for (const prereqId of coursePrerequisites) {
    // Find the semester of the prerequisite course
    const prereqSemesterIndex = profile.semesters.findIndex(semester =>
      semester.some(c => c.id === prereqId)
    )
    if (prereqSemesterIndex >= toSemester) {
      beforePrereqs.push(prereqId)
    }
  }

  if (beforePrereqs.length > 0) {
    return {
      canMove: false,
      reason: `Course ${courseId} cannot be moved to semester ${toSemester} because the following prerequisites are not met: ${beforePrereqs.map(
        prereqId => `\n- ${profile.graph.get(prereqId)?.name}`
      )}.`
    }
  }

  // Find all courses that list the moving course as a prerequisite
  const dependentCourses = getAllDependents(course.id, profile)
  for (const dependentCourse of dependentCourses) {
    const dependentCourseSemesterIndex = profile.semesters.findIndex(semester =>
      semester.some(c => c.id === dependentCourse.id)
    )

    // If the dependent course is scheduled in the same or a later semester than the new semester of the prerequisite,
    // it violates the prerequisite requirement.
    if (dependentCourseSemesterIndex <= toSemester) {
      return {
        canMove: false,
        reason: `Moving ${courseId} to semester ${toSemester} since it needs to be completed before ${dependentCourse.name} scheduled in semester ${dependentCourseSemesterIndex}.`
      }
    }
  }

  // // Check if the target semester has space
  // if ((profile.semesters[toSemester]?.length ?? 0) >= 4) {
  // 	return { canMove: false, reason: "The target semester is full." }
  // }

  return { canMove: true }
}

/**
 * SHOULD NOT BE USED DIRECTLY. Use the moveCourse function instead. If we need to move a course, we should check if it can be moved first.
 * @param course
 * @param profile
 * @returns
 */
const removeFromSemester = (course: CourseNode, profile: StudentProfile) => {
  const semesterIndex = profile.semesters.findIndex(s => s.some(c => c.id === course.id))
  if (semesterIndex === -1) {
    return
  }

  const filtered = profile.semesters[semesterIndex]?.filter(c => c.id !== course.id) ?? []
  profile.semesters[semesterIndex] = filtered
}

export function moveCourse(courseId: string, toSemester: number, profile: StudentProfile) {
  const canMove = canMoveCourse(courseId, toSemester, profile)
  if (canMove) {
    // find course name in the graph:
    const course = getCourseFromIdNameCode(profile, courseId)
    if (!course) {
      throw new Error(`Course ${courseId} not found in the student's schedule.`)
    }

    removeFromSemester(course, profile)
    addToSemester(course, toSemester, profile, false)
  }
  return profile
}
