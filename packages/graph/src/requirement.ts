import { db } from "@repo/db"

import { getCourseWithPrereqs } from "./course"
import { getAllCourseIdsInSchedule } from "./graph"
import { doesProfileContainCourse } from "./profile"
import {
  DetailedCourseInfo,
  HydratedStudentProfile,
  PrequisiteInfo,
  RequirementInfo
} from "./types"

const getRequirementInfo = ({
  id,
  requirementGroup,
  requirementSubgroup
}: {
  id: string
  requirementGroup: { id: string; name: string } | null
  requirementSubgroup: { id: string; name: string } | null
}): RequirementInfo => {
  return {
    id: id,
    requirementGroupOrSubgroup:
      requirementSubgroup !== null ? requirementSubgroup! : requirementGroup!
  }
}

export const getAlternativeCourseInfo = async (
  courseToReplaceId: string,
  profile: HydratedStudentProfile
): Promise<{ courseToReplace: DetailedCourseInfo; alternativeCourses: DetailedCourseInfo[] }> => {
  const allOtherScheduledCourseIds = getAllCourseIdsInSchedule(profile).filter(
    id => id !== courseToReplaceId
  )

  const requirementIds = profile.courseToReqList.get(courseToReplaceId) ?? []
  const alternativeCoursesPayload = await db.course.findMany({
    include: {
      requirements: {
        select: {
          id: true,
          requirementGroup: { select: { name: true, id: true } },
          requirementSubgroup: { select: { name: true, id: true } }
        }
      }
    },
    where: {
      requirements: { some: { id: { in: requirementIds } } },
      id: { notIn: allOtherScheduledCourseIds }
    }
  })

  // console.log("alternativeCoursesPayload", alternativeCoursesPayload)
  const alternativeCourses: DetailedCourseInfo[] = []

  for (const course of alternativeCoursesPayload) {
    const requirements: RequirementInfo[] = course.requirements.map(req =>
      getRequirementInfo({ ...req })
    )
    const { prereqMap } = await getCourseWithPrereqs(course.id)
    const prereqNames = await db.course.findMany({
      select: { id: true, name: true },
      where: { id: { in: prereqMap.get(course.id)! } }
    })
    const prerequisites: PrequisiteInfo[] = prereqNames.map(prereq => ({
      id: prereq.id,
      name: prereq.name,
      planned: doesProfileContainCourse(profile, prereq.id)
    }))
    alternativeCourses.push({
      id: course.id,
      name: course.name,
      courseSubject: course.courseSubject,
      courseNumber: course.courseNumber,
      creditHours: course.creditHours,
      requirements: requirements,
      prerequisites: prerequisites
    })
  }

  return {
    courseToReplace: alternativeCourses.find(course => course.id === courseToReplaceId)!,
    alternativeCourses: alternativeCourses.filter(course => course.id !== courseToReplaceId)
  }
}
export const getRequirementsFulfilledByCourse = async (
  courseId: string,
  profile: HydratedStudentProfile
): Promise<RequirementInfo[]> => {
  const requirementIds = profile.courseToReqList.get(courseId)!
  const requirementsPayload = await db.requirement.findMany({
    select: {
      id: true,
      requirementGroup: { select: { id: true, name: true } },
      requirementSubgroup: { select: { id: true, name: true } }
    },
    where: { id: { in: requirementIds } }
  })

  if (
    requirementsPayload.some(r => r.requirementGroup === null && r.requirementSubgroup === null)
  ) {
    throw Error(
      `At least one of course ${courseId}'s requirements has neither a requirementGroup nor a requirementSubgroup`
    )
  }

  return requirementsPayload.map(req => getRequirementInfo({ ...req }))
}
