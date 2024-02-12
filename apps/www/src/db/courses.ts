import { HydratedCourse } from "@/types"
import { Course, db, Department, Prerequisite } from "@db/client"

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

type HydratedCourseWithPrereqs = Course & {
  department: Department
  conditions: {
    conditions: {
      prerequisites: Prerequisite[]
    }[]
  }[]
}

type CourseWithPrereqs = {
  course: HydratedCourseWithPrereqs
  prereqs?: CourseWithPrereqs[]
}

export const getCourseWithPrereqs = async (
  courseId: string,
  queriedCourses: string[]
): Promise<CourseWithPrereqs> => {
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

  if (filteredPrereqsCourses.length === 0) {
    return { course }
  }

  // for each prereq, pull in the course and its dependencies
  const prereqs = await Promise.all(
    filteredPrereqsCourses.map(async courseId => {
      const prereqCourse = await getCourseWithPrereqs(courseId, [...queriedCourses, courseId])
      return prereqCourse
    })
  )

  return {
    course,
    prereqs
  }
}
