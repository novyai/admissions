import {
  Condition,
  ConditionGroup,
  Course,
  DegreeData,
  Department,
  Prerequisite,
  Student,
  TransferGrade,
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
