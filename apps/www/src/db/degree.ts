import { db, Prisma } from "@db/client"

import { getCourseWithPrereqs } from "./courses"

const getRequiredCoursesMap = async (deptCourses: Prisma.CourseWhereInput[]) => {
  const degreeCourses = await db.course.findMany({
    where: {
      OR: deptCourses
    },
    select: {
      id: true
    }
  })

  const withPrereqs = await Promise.all([
    ...degreeCourses.map(course => {
      return getCourseWithPrereqs(course.id, [])
    })
  ])

  const overallPrereqMap = withPrereqs.reduce((acc, { prereqMap }) => {
    for (const [courseId, prereqs] of prereqMap.entries()) {
      acc.set(courseId, [...(acc.get(courseId) || []), ...prereqs])
    }
    return acc
  }, new Map<string, string[]>())

  const overallDependentMap = withPrereqs.reduce((acc, { dependentMap }) => {
    for (const [courseId, dependents] of dependentMap.entries()) {
      acc.set(courseId, [...(acc.get(courseId) || []), ...dependents])
    }
    return acc
  }, new Map<string, string[]>())

  return { prereqMap: overallPrereqMap, dependentMap: overallDependentMap }
}

export const getDegreeData = async (deptCourses: Prisma.CourseWhereInput[]) => {
  const { prereqMap, dependentMap } = await getRequiredCoursesMap(deptCourses)

  const allCourseIds = Array.from(
    new Set([
      ...prereqMap.keys(),
      ...[...prereqMap.values()].flat(),
      ...dependentMap.keys(),
      ...[...dependentMap.values()].flat()
    ])
  )

  const allCourses = await db.course.findMany({
    where: {
      id: {
        in: allCourseIds
      }
    },
    select: {
      id: true,
      name: true
    }
  })

  return {
    prereqMap,
    allCourses,
    dependentMap
  }
}
