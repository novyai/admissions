"use server"

import { getDegreeData } from "@/db/degree"

import {
  calculateEarliestFinish,
  calculateFanOut,
  calculateLatestFinish,
  getAllRequiredCourses
} from "@graph/graph"
import { addToSemester } from "@graph/schedule"
import { BaseStudentProfile, CourseNode, StudentProfile } from "@graph/types"

export const getDegree = async (profile: StudentProfile) => {
  const { prereqMap, dependentMap, allCourses } = await getDegreeData([
    {
      id: {
        in: profile.requiredCourses
      }
    }
  ])

  for (const course of allCourses) {
    profile.graph.set(course.id, {
      id: course.id,
      earliestFinish: undefined,
      latestFinish: undefined,
      dependents: Array.from(new Set(dependentMap.get(course.id) ?? [])),
      prerequisites: Array.from(new Set(prereqMap.get(course.id) ?? [])),
      name: course.name,
      raw_course: course
    })
  }

  for (const course of allCourses) {
    calculateFanOut(course.id, profile)
    calculateEarliestFinish(course.id, profile)
    calculateLatestFinish(course.id, profile)
  }
}

export const getStudentProfile = async (profile: BaseStudentProfile) => {
  const fullProfile: StudentProfile = {
    ...profile,
    semesters: [],
    graph: new Map<string, CourseNode>()
  }

  await getDegree(fullProfile)

  const allCourses = Array.from(fullProfile.graph.values())

  // I want to sort all courses by earliest finish time, then slack

  const sortedCourses = allCourses.sort((a, b) => {
    if (a.earliestFinish === b.earliestFinish) {
      const aslack = a.latestFinish! - a.earliestFinish!
      const bslack = b.latestFinish! - b.earliestFinish!
      return aslack - bslack
    }
    return a.earliestFinish! - b.earliestFinish!
  })

  const queue = [...sortedCourses]
  while (queue.length > 0) {
    const course = queue.shift()!

    const requiredCourses = getAllRequiredCourses(course.id, fullProfile.graph).filter(
      c => c !== course.id
    )

    const uncompletedRequiredCourses = requiredCourses.filter(
      c =>
        !fullProfile.semesters
          .flat()
          .map(c => c.id)
          .includes(c)
    )

    console.log("uncompleted required courses", uncompletedRequiredCourses, "for", course.name)

    // if all required courses are found, we can add to a semester
    if (uncompletedRequiredCourses.length === 0) {
      // if there are no required courses, add to the first semester
      if (requiredCourses.length === 0) {
        addToSemester(course, 0, fullProfile)
        continue
      }

      // otherwise, find semester where this class can be placed
      const allLeftoverRequiredCourses = [...requiredCourses]

      for (let index = 0; index < fullProfile.semesters.length; index++) {
        const upToSemester = fullProfile.semesters.slice(0, index + 1).flat()

        // get all courses up to this semester and check if all required courses are found
        const leftoverRequiredCourses = allLeftoverRequiredCourses.filter(
          c => !upToSemester.map(c => c.id).includes(c)
        )

        // if all required courses are found in the current semester, add to the next semester
        if (leftoverRequiredCourses.length === 0) {
          addToSemester(course, index + 1, fullProfile)
          break
        }
      }
    } else {
      // if not all required courses are found, add to the end of the queue
      queue.push(course)
    }
  }
  return fullProfile
}
