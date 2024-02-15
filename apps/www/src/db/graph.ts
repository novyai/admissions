import { getDegreeData } from "./degree"

type CourseNode = {
  id: string
  name: string
  earliestFinish?: number
  latestFinish?: number
  dependents: string[]
  prerequisites: string[]
}

export type StudentProfile = {
  completedCourses: string[]
  requiredCourses: string[]
  timeToGraduate: number // in semesters
}

function isEligibleForCourse(course: CourseNode, completedCourses: string[]): boolean {
  // If the course has no prerequisites, then you can take it immediately
  if (course.prerequisites.length === 0) return true

  // If the student has already completed the prerequisites, then they are eligible
  const isEligible = course.prerequisites.every(prerequisite =>
    completedCourses.includes(prerequisite)
  )

  return isEligible
}

function getAllRequiredCourses(course: string, graph: Map<string, CourseNode>) {
  const requiredCourses = new Set<string>()

  const node = graph.get(course)
  if (!node) throw new Error("Course not found")
  requiredCourses.add(course)
  for (const prerequisite of node.prerequisites) {
    getAllRequiredCourses(prerequisite, graph).forEach(entry => {
      requiredCourses.add(entry)
    })
  }
  return [...requiredCourses.values()]
}

/**
 * Checks if the course doesn't have any other required courses that depend on it to graduate
 * @param node Class Node to check if it is the last required course
 * @param profile Profile of the student and degree
 * @param graph Map of all courses
 * @returns true if no other required courses depend on this course to graduate, false otherwise
 */
function isLastClassRequired(
  node: CourseNode,
  profile: StudentProfile,
  graph: Map<string, CourseNode>
): boolean {
  // checks if course is the prereq for any other required course
  if (profile.requiredCourses.includes(node.id)) {
    for (const course of profile.requiredCourses) {
      if (course === node.id) continue
      if (getAllRequiredCourses(course, graph).includes(node.id)) {
        return false
      }
    }
    return true
  }
  return false
}

function calculateEarliestFinish(
  course: string,
  graph: Map<string, CourseNode>,
  profile: StudentProfile
) {
  const node = graph.get(course)
  if (!node) {
    throw new Error("Course not found")
  }

  // If the course has already been calculated, return the value
  if (node?.earliestFinish !== undefined) return node.earliestFinish

  const prerequisites = node.prerequisites
  if (isEligibleForCourse(node, profile.completedCourses)) {
    console.log("EFT for: ", node.name, "is 1")
    node.earliestFinish = 1
    return node.earliestFinish
  }

  // Calculate the EFT for each prerequisite
  node.earliestFinish = Math.max(
    ...prerequisites.map(prerequisite => {
      return calculateEarliestFinish(prerequisite, graph, profile) + 1
    })
  )

  return node.earliestFinish
}

function calculateLatestFinish(
  course: string,
  graph: Map<string, CourseNode>,
  profile: StudentProfile
) {
  const node = graph.get(course)
  if (!node) throw new Error("Course not found")
  if (node?.latestFinish !== undefined) {
    return node.latestFinish
  }

  const dependents = node.dependents

  if (isLastClassRequired(node, profile, graph)) {
    node.latestFinish = profile.timeToGraduate
    return node.latestFinish
  }

  node.latestFinish = Math.min(
    ...dependents.map(dependent => {
      const dependentNode = graph.get(dependent)
      return calculateLatestFinish(dependentNode?.id ?? "none", graph, profile) - 1
    })
  )

  return node.latestFinish
}

export const getDegree = async (profile: StudentProfile) => {
  const { prereqMap, dependentMap, allCourses } = await getDegreeData([
    {
      id: {
        in: profile.requiredCourses
      }
    }
  ])

  const graph = new Map<string, CourseNode>()

  for (const course of allCourses) {
    graph.set(course.id, {
      id: course.id,
      earliestFinish: undefined,
      latestFinish: undefined,
      dependents: Array.from(new Set(dependentMap.get(course.id) ?? [])),
      prerequisites: Array.from(new Set(prereqMap.get(course.id) ?? [])),
      name: course.name
    })
  }

  for (const course of allCourses) {
    calculateEarliestFinish(course.id, graph, profile)
    calculateLatestFinish(course.id, graph, profile)
  }

  return graph
}

// const calc2 = "faec91f2-461b-4bb7-b266-cd1307ecae4d"
// const calc1 = "2e6b393e-1b5c-4a46-a5be-f62e41545748"
// const calc3 = "e4ada3c1-f89a-48c6-bbcd-3a6165fce77d"
// const precalc = "6b15a066-a434-499b-8b26-6179ff2dca19"

// const mathProfile: StudentProfile = {
//   requiredCourses: [calc2, calc1],
//   completedCourses: [precalc],
//   timeToGraduate: 4
// }

// await getDegree(mathProfile)

// const deptCourses = Object.keys(cseDegree.Courses).map((course): Prisma.CourseWhereInput => {
//   const [dept, num] = course.split(" ")
//   return {
//     department: {
//       code: dept
//     },
//     courseNumber: num
//   }
// })

// const requiredCourses = await db.course.findMany({
//   where: {
//     OR: deptCourses
//   },
//   select: {
//     id: true,
//     name: true
//   }
// })

// console.log(requiredCourses.map(course => course.name))

// const cseProfile: StudentProfile = {
//   requiredCourses: requiredCourses.map(course => course.id),
//   completedCourses: [],
//   timeToGraduate: 8
// }

// await getDegree(cseProfile)
