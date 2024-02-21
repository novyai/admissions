export type CourseNode = {
  id: string
  name: string
  dependents: string[]
  prerequisites: string[]

  earliestFinish?: number
  latestFinish?: number
  fanOut?: number // Number of courses that depend on this course
}

export type BaseStudentProfile = {
  requiredCourses: string[]
  timeToGraduate: number // in semesters
  coursePerSemester: number
}

export type StudentProfile = BaseStudentProfile & {
  semesters: CourseNode[][]
  graph: Map<string, CourseNode>
}