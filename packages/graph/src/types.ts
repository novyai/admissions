import { z } from "zod"

import { Program } from "./defaultCourses"

export const SEMESTER_OPTIONS = ["FALL", "SPRING", "SUMMER"] as const
export const SemesterEnum = z.enum(SEMESTER_OPTIONS)
export type Semester = z.infer<typeof SemesterEnum>

export const SemesterYear = z.object({
  semester: SemesterEnum,
  year: z.number()
})
export type SemesterYearType = z.infer<typeof SemesterYear>

export type CourseNode = {
  id: string
  name: string
  programs: Program[] | undefined
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
  programs: Program[]
  timeToGraduate: number // in semesters
  currentSemester: number
  coursePerSemester: number
  startTerm: SemesterYearType
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
