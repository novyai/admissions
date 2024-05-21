import { HydratedCourse } from "@/types"
import { db } from "@repo/db"

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

export const getCourses = async (courseIds: string[]): Promise<HydratedCourse[]> => {
  try {
    return await db.course.findMany({
      where: {
        id: {
          in: courseIds
        }
      },
      include: {
        department: true,
        conditions: true,
        prerequisites: true
      }
    })
  } catch (error) {
    console.error("Failed to get courses: ", error)
    throw new Error("Failed to get courses")
  }
}
