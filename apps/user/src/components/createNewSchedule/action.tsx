"use server"

import { createBlob } from "@graph/blob"
import { getStudentProfileFromRequirements } from "@graph/profile"
import {
  BaseStudentProfile,
  PositiveScheduleConstraint,
  ScheduleConstraints,
  SemesterYearType
} from "@graph/types"
import { db } from "@repo/db"

import { calculateSemesterDifference } from "@/lib/schedule/utils"

import { CoursesInfo } from "./student-courses-form"

function convertCoursesInfoToPositiveConstraints(
  coursesInfo: CoursesInfo
): PositiveScheduleConstraint[] {
  const constraints: PositiveScheduleConstraint[] = []
  for (const semester in coursesInfo) {
    constraints.push({
      semester: parseInt(semester),
      courseIDs: coursesInfo[semester].map(course => course.value),
      canAddCourses: false
    })
  }
  return constraints
}

/**
 * Create a new schedule and its first version for the user
 * @param userId The user's ID
 * @param programs The user's programs to pull in courses from
 * @returns The ID of the newly created schedule
 */
export async function createNewSchedule(
  userId: string,
  tracks: string[],
  startTerm: SemesterYearType,
  coursesInfo?: CoursesInfo
) {
  const currentSemester = calculateSemesterDifference(startTerm) - 1

  const constraints: ScheduleConstraints = {
    positive: coursesInfo ? convertCoursesInfoToPositiveConstraints(coursesInfo) : [],
    negative: []
  }

  const takenCourses: string[] = []
  if (coursesInfo !== undefined) {
    for (const semester in coursesInfo) {
      for (const course of coursesInfo[semester]) {
        takenCourses.push(course.value)
      }
    }
  }

  const baseProfile: BaseStudentProfile = {
    tracks,
    requiredCourses: [],
    transferCredits: [],
    timeToGraduate: 8,
    coursePerSemester: 5,
    currentSemester: currentSemester,
    startTerm: startTerm,
    takenCourses: takenCourses
  }

  const studentProfile = await getStudentProfileFromRequirements(baseProfile, constraints)

  const schedule = await db.schedule.create({
    data: {
      userID: userId,
      versions: {
        create: {
          blob: createBlob(studentProfile)
        }
      }
    },
    select: {
      id: true
    }
  })

  return schedule.id
}

// export async function getAllComputerScienceCoursesForUniversity(
//   universityId: string
// ): Promise<Array<{ id: string; name: string }>> {
//   let courses: Array<{ id: string; name: string }> = []
//   const { requiredCourses, extraToQuery } = await getCoursesForProgram("CS")

//   universityId

//   for (const coursePayloadList of [requiredCourses, extraToQuery]) {
//     if (coursePayloadList) {
//       courses = courses.concat(
//         coursePayloadList.map(coursePayload => ({
//           id: coursePayload.id,
//           name: coursePayload.name
//         }))
//       )
//     }
//   }
//   return courses
// }

export async function getProgramsForAllUniversities() {
  return await db.university.findMany({
    select: {
      Program: {
        include: {
          tracks: true
        }
      },
      id: true,
      name: true
    }
  })
}

export type UniversityProgram = Awaited<ReturnType<typeof getProgramsForAllUniversities>>[number]

export async function searchCourses(query: string) {
  if (query === "") {
    return []
  }
  return await db.course.findMany({
    select: {
      name: true,
      courseNumber: true,
      courseSubject: true,
      id: true
    },
    where: {
      OR: [
        { courseNumber: { contains: query } },
        { courseSubject: { contains: query } },
        { name: { contains: query } }
      ]
    },
    take: 10
  })
}
