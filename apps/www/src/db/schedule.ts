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
 * @param fromSemester The current semester index of the course.
 * @param toSemester The target semester index to move the course to.
 * @param semesters The current schedule of semesters.
 * @param degreeData The degree data containing course prerequisites.
 * @returns {boolean} True if the course can be moved, false otherwise.
 */
export function canMoveCourse(
  courseId: string,
  fromSemester: number,
  toSemester: number,
  degreeData: Map<string, CourseNode>,
  profile: StudentProfile
): boolean {
  if (toSemester >= profile.timeToGraduate) {
    console.error("Cannot move course beyond the student's time to graduate.")
    return false
  }

  // Ensure the course exists in the fromSemester
  if (!profile.semesters[fromSemester]?.find(c => c.id === courseId)) {
    console.error("Course not found in the specified fromSemester.")
    return false
  }

  // Check if moving the course violates any prerequisite requirements
  const coursePrerequisites = getAllRequiredCourses(courseId, degreeData)
  for (const prereqId of coursePrerequisites) {
    // Find the semester of the prerequisite course
    const prereqSemesterIndex = profile.semesters.findIndex(semester =>
      semester.some(c => c.id === prereqId)
    )
    if (prereqSemesterIndex >= toSemester) {
      console.error("Moving the course violates prerequisite requirements.")
      return false
    }
  }

  // Check if the target semester has space
  if ((profile.semesters[toSemester]?.length ?? 0) >= 4) {
    console.error("The target semester is full.")
    return false
  }

  return true
}
