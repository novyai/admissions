import { db } from "@repo/db"

import { HydratedStudentProfile } from "./types"

export const getRequirementsFulfilledByCourse = async (
  courseId: string,
  profile: HydratedStudentProfile
): Promise<Array<{ id: string; name: string }>> => {
  const requirementIds = profile.courseToReqList.get(courseId)!
  const requirementGroups = await db.requirement.findMany({
    select: {
      id: true,
      requirementGroup: { select: { id: true, name: true } },
      requirementSubgroup: { select: { id: true, name: true } }
    },
    where: { id: { in: requirementIds } }
  })

  const requirements = requirementGroups
    .filter(req => req.requirementGroup !== null || req.requirementSubgroup !== null)
    .map(req =>
      req.requirementSubgroup !== null ? req.requirementSubgroup! : req.requirementGroup!
    )
  return requirements
}
