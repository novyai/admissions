import { StudentProfile } from "./types"


export const getCourseFromNameOrCode = (profile: StudentProfile, course: string) => {
  return [...profile.graph.values()].find(c => c.name == course) ??
    [...profile.graph.values()].find(
      c => `${c.raw_course.courseSubject} ${c.raw_course.courseNumber}` == course
    )

}
