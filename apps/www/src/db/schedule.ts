import { CourseNode, getAllRequiredCourses, StudentProfile } from "./graph"

/**
 * Add a course to a semester, or a future semester if the current semester is full
 * @param course The course to add
 * @param semesters The schedule of semesters to add the course to
 * @param semester The semester index to add the course to
 */
export function addToSemester(course: CourseNode, semester: number, profile: StudentProfile) {
  if (semester >= profile.timeToGraduate || profile.semesters.length >= profile.timeToGraduate) {
    throw new Error(`Can only have ${profile.timeToGraduate} semesters`)
  }
  if (profile.semesters[semester]) {
    if (profile.semesters[semester]?.length! >= profile.coursePerSemester) {
      addToSemester(course, semester + 1, profile)
    } else {
      profile.semesters[semester]?.push(course)
    }
  } else {
    profile.semesters.push([course])
  }
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
): string {
  if (toSemester >= profile.timeToGraduate) {
    return "Cannot move course beyond the student's time to graduate."
  }

  // find course name in the graph:
  const course = [...profile.graph.values()].find(c => c.name == courseId)
  console.log("course", course)
  if (!course) {
    return `Course ${courseId} not found in the student's schedule.`
  }

  // Does the course exist in the profile?
  const fromSemester = profile.semesters.findIndex(s => s.some(c => c.id === course.id))

  // Ensure the course exists in the fromSemester
  if (fromSemester === -1) {
    return "Course not found in the student's schedule."
  }

  // Check if moving the course violates any prerequisite requirements
  const coursePrerequisites = getAllRequiredCourses(course.id, profile.graph)
  for (const prereqId of coursePrerequisites) {
    // Find the semester of the prerequisite course
    const prereqSemesterIndex = profile.semesters.findIndex(semester =>
      semester.some(c => c.id === prereqId)
    )
    if (prereqSemesterIndex >= toSemester) {
      return "Moving the course violates prerequisite requirements."
    }
  }

  // Check if the target semester has space
  if ((profile.semesters[toSemester]?.length ?? 0) >= 4) {
    return "The target semester is full."
  }

  return `Course ${courseId} can be moved to semester ${toSemester}.`
}
