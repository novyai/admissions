"use server"

import { UniversityPrograms } from "@/types"
import { createBlob } from "@graph/blob"
import { Program } from "@graph/defaultCourses"
import { getStudentProfileFromRequirements } from "@graph/profile"
import { BaseStudentProfile, SemesterYearType } from "@graph/types"
import { db } from "@repo/db"

import { calculateSemesterDifference } from "@/lib/schedule/utils"

/**
 * Create a new schedule and its first version for the user
 * @param userId The user's ID
 * @param programs The user's programs to pull in courses from
 * @returns The ID of the newly created schedule
 */
export async function createNewSchedule(
  userId: string,
  programs: Program[],
  startTerm: SemesterYearType
) {
  const currentSemester = calculateSemesterDifference(startTerm) - 1
  const baseProfile: BaseStudentProfile = {
    programs,
    requiredCourses: [],
    transferCredits: [],
    timeToGraduate: 8,
    coursePerSemester: 5,
    currentSemester: currentSemester,
    startTerm: startTerm
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

export async function getAllCoursesForUniversity(
  universityId: string
): Promise<Array<{ id: string; name: string }>> {
  return await db.course.findMany({
    select: {
      name: true,
      id: true
    },
    where: { universityId: universityId },
    take: 10
  })
}

export async function getProgramsForAllUniversities(): Promise<UniversityPrograms[]> {
  return await db.university.findMany({
    select: {
      Program: {
        include: {
          department: {
            select: {
              id: true,
              code: true
            }
          }
        }
      },
      id: true,
      name: true
    }
  })
}
