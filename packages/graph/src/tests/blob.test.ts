import { createBlob, parseBlob } from "@graph/blob"
import { getStudentProfileFromRequirements } from "@graph/profile"
import { BaseStudentProfile } from "@graph/types"
import { expect, test } from "bun:test"

const profile: BaseStudentProfile = {
  tracks: ["0f9f18f2-c995-417e-9410-f611e0fff2c3"],
  requiredCourses: [],
  transferCredits: [],
  timeToGraduate: 4,
  currentSemester: 1,
  coursePerSemester: 5,
  startDate: "Fall 2020"
}

test("blob", async () => {
  const hydrate = await getStudentProfileFromRequirements(profile)
  const blob = createBlob(hydrate)
  const parsed = parseBlob(blob)
  const rehydrated = await getStudentProfileFromRequirements(parsed)
  expect(rehydrated).toEqual(hydrate)
})
