import { z } from "zod"

export type CourseNode = {
  id: string
  name: string
  tracks: string[] | undefined
  dependents: string[]
  prerequisites: string[]
  corequisites: string[]

  earliestFinish?: number
  latestFinish?: number
  fanOut?: number // Number of courses that depend on this course
}

export type BaseStudentProfile = {
  /**
   * All courses that are required for the student to finish their degree.
   */
  requiredCourses: string[]
  transferCredits: string[]
  tracks: string[]
  timeToGraduate: number // in semesters
  currentSemester: number
  coursePerSemester: number
  startDate: string
}

export const studentProfileSchema = z.custom<StudentProfile>()

export type StudentProfile = BaseStudentProfile & {
  semesters: string[][]
  // graph: Map<string, CourseNode>
  // allCourses: CourseNode[]
}

export type HydratedStudentProfile = BaseStudentProfile & {
  semesters: CourseNode[][]
  graph: Map<string, CourseNode>
  // allCourses: CourseNode[]
}

export type PositiveScheduleConstraint = {
  semester: number
  courseIDs: string[]
  canAddCourses: boolean
}

export type NegativeScheduleConstraint = {
  courseID: string
  semester: number
}

export type ScheduleConstraints = {
  positive: PositiveScheduleConstraint[]
  negative: NegativeScheduleConstraint[]
}
