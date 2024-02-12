import { HydratedCourse, HydratedCourseWithPrereqs } from "@/types"
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

export const getCourseWithPrereqs = async (
  courseId: string,
  queriedCourses: string[]
): Promise<{
  course: HydratedCourseWithPrereqs
  prereqMap: Map<string, string[]>
}> => {
  // pull in current course
  const course = await db.course.findUnique({
    where: {
      id: courseId
    },
    include: {
      department: true,
      conditions: {
        include: {
          conditions: {
            include: {
              prerequisites: true
            }
          }
        }
      }
    }
  })

  if (!course) {
    throw new Error("Course not found")
  }

  // dedup prereq courses
  const prereqsCourses = new Set(
    course.conditions.flatMap(c => c.conditions.flatMap(c => c.prerequisites.map(p => p.courseId)))
  )

  // remove circular dependencies from the query
  const filteredPrereqsCourses = [...prereqsCourses].filter(c => !queriedCourses.includes(c))

  const prereqMap = new Map([[course.id, filteredPrereqsCourses]])
  if (filteredPrereqsCourses.length === 0) {
    return {
      course,
      prereqMap
    }
  }

  let newQueriedCourses = [...queriedCourses, course.id]
  for (const courseId of filteredPrereqsCourses) {
    newQueriedCourses = [...queriedCourses, courseId]
    const { prereqMap: prereqPrereqMap } = await getCourseWithPrereqs(courseId, newQueriedCourses)
    for (const [key, value] of prereqPrereqMap) {
      prereqMap.set(key, value)
    }
  }

  return {
    course,
    prereqMap
  }
}
