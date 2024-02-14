import { Prisma } from "@db/client"

import { getDegreeData } from "./degree"

type CourseNode = {
  id: string
  name: string
  earliestFinish?: number
  latestFinish?: number
  dependents: string[]
  prerequisites: string[]
}

type Profile = {
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

function isLastClassRequired(node: CourseNode, profile: Profile): boolean {
  // checks if calc 1 is the prereq for any other required course
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

function calculateEarliestFinish(course: string, graph: Map<string, CourseNode>, profile: Profile) {
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

function calculateLatestFinish(course: string, graph: Map<string, CourseNode>, profile: Profile) {
  const node = graph.get(course)
  if (!node) throw new Error("Course not found")
  if (node?.latestFinish !== undefined) {
    return node.latestFinish
  }

  const dependents = node.dependents

  if (isLastClassRequired(node, profile)) {
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

const printPrereqs = (graph: Map<string, CourseNode>) => {
  for (const [course, node] of graph) {
    console.log(
      `${node.name} (${node.id}) has prerequisites:`,
      node.prerequisites.map(prereq => graph.get(prereq)?.name)
    )
  }
}

const getDegree = async (profile: Profile) {

  const { prereqMap, dependentMap, allCourses } = await getDegreeData([
    {
      id: {
        equals: profile.requiredCourses[0]
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

  for (const course of profile.requiredCourses) {
    calculateEarliestFinish(course, graph, profile)
    calculateLatestFinish(course, graph, profile)
  }

  console.log("the goal is to complete course: ", graph.get(profile.requiredCourses[0]!)?.name)
  console.log(
    "so far you have completed: ",
    profile.completedCourses.map(course => graph.get(course)?.name) + "\n\n"
  )

  printPrereqs(graph)

  console.log("\n\n")

  console.log(graph)

}

const calc2 = "faec91f2-461b-4bb7-b266-cd1307ecae4d"
const calc1 = "2e6b393e-1b5c-4a46-a5be-f62e41545748"
const calc3 = "e4ada3c1-f89a-48c6-bbcd-3a6165fce77d"
const precalc = "6b15a066-a434-499b-8b26-6179ff2dca19"

const profile: Profile = {
  requiredCourses: [calc2, calc1],
  completedCourses: [precalc],
  timeToGraduate: 4
}

await getDegree(profile)

