"use server"

import { UniversityPrograms } from "@/types"
import { createBlob } from "@graph/blob"
import { getStudentProfileFromRequirements } from "@graph/profile"
import { BaseStudentProfile } from "@graph/types"
import { db } from "@repo/db"

import { calculateSemesterDifference } from "@/lib/schedule/utils"

/**
 * Create a new schedule and its first version for the user
 * @param userId The user's ID
 * @param programs The user's programs to pull in courses from
 * @returns The ID of the newly created schedule
 */
export async function createNewSchedule(userId: string, programs: string[], startDate: string) {
  const currentSemester = calculateSemesterDifference(startDate)
  const baseProfile: BaseStudentProfile = {
    programs,
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

export async function getProgramsForAllUniversities(): Promise<UniversityPrograms[]> {
  return await db.university.findMany({
    select: {
      Program: true,
      id: true,
      name: true
    }
  })
}
