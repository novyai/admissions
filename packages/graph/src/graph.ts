import { CourseNode, StudentProfile } from "@graph/types"
import { CourseGraph, computeNodeStats } from "./profile"
import Graph from "graphology"

export function studentProfileToGraph(profile: StudentProfile) : CourseGraph {

  const graph : CourseGraph = new Graph()

  for (const courseNode of profile.allCourses) {
    graph.addNode(courseNode.id, {
      id: courseNode.id,
      courseSubject: courseNode.raw_course.courseSubject,
      courseNumber: courseNode.raw_course.courseNumber,
      name: courseNode.name,
      departmentId: courseNode.raw_course.departmentId,
      universityId: courseNode.raw_course.universityId,

      startTerm: null,
      endTerm: null, 

      hasAttributes: false,
      fanOut: undefined,
      earliestFinish: undefined,
      latestFinish: undefined,
      slack: undefined,

      //TODO: add semester
    })
  }

  for (const courseNode of profile.allCourses) {
    for (const prereq of courseNode.prerequisites) {
      graph.addDirectedEdge(prereq, courseNode.id)
    }
  }

  computeNodeStats(graph, profile)

  return graph
}

/**
 * Returns all of the courses that depend on the given course
 * @param course Course to get all required courses for
 * @param graph Map of all courses
 * @returns Array of all required courses for the given course
 */
export function getAllRequiredCourses(course: string, graph: Map<string, CourseNode>) {
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

export const getAllPrereqs = (courseId: string, profile: StudentProfile): CourseNode[] => {
  const course = profile.graph.get(courseId)
  if (!course) {
    return []
  }

  const prereqs = course.prerequisites
  if (prereqs.length === 0) {
    return [course]
  }
  const prereqCourses = prereqs.map(p => getAllPrereqs(p, profile)).flat()

  return [course, ...prereqCourses]
}

export const getAllDependents = (courseId: string, profile: StudentProfile): CourseNode[] => {
  const course = profile.graph.get(courseId)
  if (!course) {
    return []
  }

  const dependents = course.dependents
  if (dependents.length === 0) {
    return [course]
  }
  const dependentCourses = dependents.map(p => getAllDependents(p, profile)).flat()

  return [course, ...dependentCourses]
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
