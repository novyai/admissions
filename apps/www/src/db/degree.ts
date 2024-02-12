import { db, Prisma } from "@db/client"

import "./courses"

import { HydratedCourse } from "@/types"

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

  return overallPrereqMap
}

async function topologicalSort(prereqMap: Map<string, string[]>): Promise<string[]> {
  let visited = new Set<string>()
  let visiting = new Set<string>()
  let stack: string[] = []

  function visit(courseId: string) {
    if (visiting.has(courseId)) {
      throw new Error(
        `The graph has a cycle and cannot be topologically sorted. ${courseId}, ${stack}`
      )
    }
    if (visited.has(courseId)) return

    visiting.add(courseId)

    // Recursively visit all the prerequisites
    const prerequisites = prereqMap.get(courseId) || []
    prerequisites.forEach(prereq => visit(prereq))

    // Mark the current node as visited and remove it from the visiting set
    visiting.delete(courseId)
    visited.add(courseId)
    stack.unshift(courseId) // Add the current node to the stack (front for topological order)
  }

  // Perform DFS from each node
  const allKeys = [...prereqMap.keys()]

  allKeys.forEach(courseId => {
    if (!visited.has(courseId)) {
      visit(courseId)
    }
  })

  return stack
}

const planSchedule = (sortedCourses: string[], coursesPerSemester: number): string[][] => {
  const schedule: string[][] = []

  for (let i = 0; i < sortedCourses.length; i += coursesPerSemester) {
    schedule.push(sortedCourses.slice(i, i + coursesPerSemester))
  }

  return schedule
}

export const getDegreeData = async (deptCourses: Prisma.CourseWhereInput[]) => {
  const prereqMap = await getRequiredCoursesMap(deptCourses)

  const sortedCourses = await topologicalSort(prereqMap)

  const schedule = planSchedule(sortedCourses, 4)

  const courseMap = await db.course.findMany({
    where: {
      OR: sortedCourses.map(courseId => ({ id: courseId }))
    },
    include: {
      department: true
    }
  })

  const missingCourses = sortedCourses.filter(
    courseId => !courseMap.find(course => course.id === courseId)
  )

  const allCourses: HydratedCourse[] = await db.course.findMany({
    where: {
      id: {
        in: sortedCourses
      }
    },
    include: {
      department: true,
      prerequisites: true,
      conditions: true
    }
  })

  return {
    schedule,
    allCourses,
    courseMap,
    missingCourses
  }
}
