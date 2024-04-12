import { Prisma } from "@repo/db"
import cseDegree from "@repo/db/data/cse_requirments"

export const ProgramOption = {
  CS: "CS" as const,
  DS: "DS" as const
}

export const prgoramName = {
  [ProgramOption.CS]: "Computer Science",
  [ProgramOption.DS]: "Data Science"
}

export const Programs = ["CS", "DS"] as const
export type Program = (typeof Programs)[number]

const CSE: Prisma.CourseScalarWhereInput = {
  OR: cseDegree.map((course): Prisma.CourseWhereInput => {
    return {
      department: {
        code: course.course_dept
      },
      courseNumber: course.course_code
    }
  })
}

type ProgramsCourses = {
  requiredCourses: Prisma.CourseWhereInput | undefined
  extraToQuery: Prisma.CourseWhereInput | undefined
}

export const programHandler: Record<Program, ProgramsCourses> = {
  [ProgramOption.CS]: {
    requiredCourses: CSE,
    extraToQuery: {
      id: {
        in: [
          "1665c198-ca4c-4864-940a-dc30eb56c254",
          "ddb93b70-f341-4418-96b5-fdb76e393bc0",
          "840c70bd-ba85-44ef-93bd-23168cbb86a5",
          "99f7b5df-6526-4753-b198-3e305c4ece27",
          "23513c34-8285-432a-abe6-ec5daf607749",
          "959a8d60-17b9-4935-a8b1-a19c22542d72"
        ]
      }
    }
  },
  [ProgramOption.DS]: {
    requiredCourses: undefined,
    extraToQuery: undefined
  }
}
