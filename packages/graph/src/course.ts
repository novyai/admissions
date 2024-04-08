import { StudentProfile } from "./types"

export const getCourseFromIdNameCode = (profile: StudentProfile, courseQuery: string) => {
  const courses = [...profile.graph.values()]

  const course =
    courses.find(c => c.name == courseQuery) ??
    // courses.find(
    //   c => `${c.raw_course.courseSubject} ${c.raw_course.courseNumber}` == courseQuery
    // ) ??
    courses.find(c => c.id == courseQuery)

  if (course === undefined) {
    throw Error(`Course ${course} not found in student profile`)
  }

  return course
}
