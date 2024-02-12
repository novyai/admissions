import { db, Prisma } from "@db/client"

import { getCourseWithPrereqs } from "./courses"

export const getRequiredCoursesForDegree = async (deptCourses: Prisma.CourseWhereInput[]) => {
  const degrees = await db.course.findMany({
    where: {
      OR: deptCourses
    },
    select: {
      id: true
    }
  })

  const withPrereqs = await Promise.all([
    ...degrees.map(course => {
      return getCourseWithPrereqs(course.id, [])
    })
  ])
  return withPrereqs
}
