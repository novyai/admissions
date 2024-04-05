"use server"

import { Program, programHandler } from "@graph/defaultCourses"
import { getStudentProfileFromRequirements } from "@graph/profile"
import { BaseStudentProfile } from "@graph/types"
import { db } from "@repo/db"

import { createBlob } from "@/lib/version-blob"
import { getAllNodesAndEdges } from "@/components/dag/action"

/**
 * Create a new schedule and its first version for the user
 * @param userId The user's ID
 * @param programs The user's programs to pull in courses from
 * @returns The ID of the newly created schedule
 */
export async function createNewSchedule(userId: string, programs: Program[]) {
  const deptCourses = new Set(programs.map(program => programHandler[program]).flat())
  const requiredCourses = await db.course.findMany({
    where: {
      OR: Array.from(deptCourses)
    },
    select: {
      id: true
    }
  })

  const baseProfile: BaseStudentProfile = {
    requiredCourses: requiredCourses.map(course => course.id),
    transferCredits: [],
    timeToGraduate: 8,
    coursePerSemester: 6,
    currentSemester: 0
  }

  const studentProfile = await getStudentProfileFromRequirements(baseProfile)
  const { defaultNodes } = await getAllNodesAndEdges(studentProfile)

  const schedule = await db.schedule.create({
    data: {
      userID: userId,
      versions: {
        create: {
          blob: JSON.stringify(createBlob(studentProfile, defaultNodes))
        }
      }
    },
    include: {
      versions: {
        select: {
          scheduleId: true,
          blob: true,
          createdAt: true,
          id: true
        },
        orderBy: {
          createdAt: "asc"
        }
      }
    }
  })

  return schedule.id
}
