import { z } from "zod"

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
  startTerm: SemesterYearType
  takenCourses: string[]
}

export const studentProfileSchema = z.custom<BaseStudentProfileWithSemesters>()

export type BaseStudentProfileWithSemesters = BaseStudentProfile & {
  semesters: string[][]
}

export type HydratedStudentProfile = BaseStudentProfile & {
  semesters: CourseNode[][]
  graph: Map<string, CourseNode>
  courseToReqList: Map<string, string[]>
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

export interface CourseWithNameCode {
  id: string
  name: string
  courseSubject: string
  courseNumber: string
  creditHours: number
}

export interface RequirementInfo {
  id: string
  requirementGroupOrSubgroup: {
    id: string
    name: string
  }
}

export interface PrereqDependentInfo {
  planned: boolean
  semester?: number
  id: string
  name: string
}

export interface DetailedCourseInfo extends CourseWithNameCode {
  prerequisites: PrereqDependentInfo[]
  dependents: PrereqDependentInfo[]
  requirements: RequirementInfo[]
}
