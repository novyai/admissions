import { StudentProfile } from "./types"


export const getCourseFromIdNameCode = (profile: StudentProfile, course: string) => {
  return [...profile.graph.values()].find(c => c.name == course) ??
    [...profile.graph.values()].find(
      c => `${c.raw_course.courseSubject} ${c.raw_course.courseNumber}` == course
    ) ??
    [...profile.graph.values()].find(c => c.id == course)

}
