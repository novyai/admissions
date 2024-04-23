"use server"

import { createBlob } from "@graph/blob"
import { Program } from "@graph/defaultCourses"
import { getStudentProfileFromRequirements } from "@graph/profile"
import { BaseStudentProfile } from "@graph/types"
import { db } from "@repo/db"

/**
 * Create a new schedule and its first version for the user
 * @param userId The user's ID
 * @param programs The user's programs to pull in courses from
 * @returns The ID of the newly created schedule
 */
export async function createNewSchedule(userId: string, programs: Program[]) {
  const baseProfile: BaseStudentProfile = {
    programs,
    requiredCourses: [],
    transferCredits: [],
    timeToGraduate: 8,
    coursePerSemester: 5,
    currentSemester: 0
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
