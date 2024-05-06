"use server"

import { createBlob } from "@graph/blob"
import { getStudentProfileFromRequirements } from "@graph/profile"
import { BaseStudentProfile } from "@graph/types"
import { db } from "@repo/db"

import { calculateSemesterDifference } from "@/lib/schedule/utils"

/**
 * Create a new schedule and its first version for the user
 * @param userId The user's ID
 * @param tracks The user's programs to pull in courses from
 * @returns The ID of the newly created schedule
 */
export async function createNewSchedule(userId: string, tracks: string[], startDate: string) {
  const currentSemester = calculateSemesterDifference(startDate)
  const baseProfile: BaseStudentProfile = {
    tracks,
    requiredCourses: [],
    transferCredits: [],
    timeToGraduate: 8,
    coursePerSemester: 5,
    currentSemester: currentSemester,
    startDate: startDate
  }
  const studentProfile = await getStudentProfileFromRequirements(baseProfile)

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
