import {
  BaseStudentProfileWithSemesters,
  HydratedStudentProfile,
  studentProfileSchema
} from "@graph/types"
import { JsonValue } from "@prisma/client/runtime/library"

export function createBlob(profile: HydratedStudentProfile): BaseStudentProfileWithSemesters {
  return {
    ...profile,
    semesters: profile.semesters.map(s => s.map(c => c.id))
  }
}

export function parseBlob(blob: JsonValue): BaseStudentProfileWithSemesters {
  const parsed = studentProfileSchema.safeParse(blob)
  if (parsed.success) {
    return parsed.data
  } else {
    throw new Error("Invalid blob", parsed.error)
  }
}
