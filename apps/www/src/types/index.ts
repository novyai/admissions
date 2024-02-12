import {
  ConditionGroup,
  Course,
  DegreeData,
  Department,
  Prerequisite,
  Student,
  TransferGrade,
  University,
  UniversityGrade,
  User
} from "@db/client"

export type HydratedStudent = {
  user: User
  degreeData: DegreeData[]
  transferGrades: TransferGrade[]
  universityGrades: UniversityGrade[]
} & Student

export type HydratedCourse = {
  conditions: ConditionGroup[]
  prerequisites: Prerequisite[]
  department: Department
} & Course

export type HydratedUniversityGrade = {
  course: Course
} & UniversityGrade

export type StudentTranscript = {
  universityGrades: HydratedUniversityGrade[]
  transferGrades: TransferGrade[]
  degreeData: DegreeData[]
  user: User
}

type HydratedCourseWithPrereqs = Course & {
  department: Department
  conditions: {
    conditions: {
      prerequisites: Prerequisite[]
    }[]
  }[]
}

export type CourseWithPrereqs = {
  course: HydratedCourseWithPrereqs
  prereqs?: CourseWithPrereqs[]
}
