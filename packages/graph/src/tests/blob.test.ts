import { createBlob, parseBlob } from "@graph/blob"
import { ProgramOption } from "@graph/defaultCourses"
import { getStudentProfileFromRequirements } from "@graph/profile"
import { BaseStudentProfile } from "@graph/types"
import { expect, test } from "bun:test"

const profile: BaseStudentProfile = {
  programs: [ProgramOption.CS],
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
