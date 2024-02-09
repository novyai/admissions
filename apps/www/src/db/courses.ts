import { HydratedCourse } from "@/types"
import { db } from "@db/client"

export const getAllCourses = async ({
  skip = 0,
  take = 20,
  filters = {},
  orderBy = {}
}): Promise<{
  courses: HydratedCourse[]
  total: number
}> => {
  const where = {
    ...filters
  }

  try {
    const [courses, total] = await db.$transaction([
      db.course.findMany({
        skip,
        take,
        where,
        orderBy,
        include: {
          department: true,
          conditions: true,
          prerequisites: true
        }
      }),
      db.course.count({ where })
    ])

    return { courses, total }
  } catch (error) {
    console.error("Failed to get all courses: ", error)
    throw new Error("Failed to get all courses")
  }
}
