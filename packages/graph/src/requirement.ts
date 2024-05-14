import { db } from "@repo/db"

import { HydratedStudentProfile } from "./types"

export const getRequirementNamesFulfilledByCourse = async (
  courseId: string,
  profile: HydratedStudentProfile
): Promise<string[]> => {
  const requirementIds = profile.courseToReqList.get(courseId)!
  const requirementGroups = await db.requirement.findMany({
    select: {
      id: true,
      requirementGroup: { select: { name: true } },
      requirementSubgroup: { select: { name: true } }
    },
    where: { id: { in: requirementIds } }
  })

  const requirementNames = requirementGroups.map(req =>
    req.requirementSubgroup !== null ? req.requirementSubgroup.name : req.requirementGroup?.name
  )
  return requirementNames.filter(req => req !== undefined) as string[]
}
