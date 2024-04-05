import { Prisma } from "@repo/db"
import cseDegree from "@repo/db/data/cse_requirments"

export enum Program {
  "CS" = "CS",
  "DS" = "DS"
}

export const programHandler: Record<Program, Prisma.CourseWhereInput[]> = {
  [Program.CS]: cseDegree.map((course): Prisma.CourseWhereInput => {
    return {
      department: {
        code: course.course_dept
      },
      courseNumber: course.course_code
    }
  }),
  [Program.DS]: cseDegree.map((course): Prisma.CourseWhereInput => {
    return {
      department: {
        code: course.course_dept
      },
      courseNumber: course.course_code
    }
  })
}
