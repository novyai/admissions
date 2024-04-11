import { ProgramOption } from "@graph/defaultCourses"
import { buildSemesters, graphToHydratedStudentProfile, studentProfileToGraph } from "@graph/graph"
import { getStudentProfileFromRequirements, pushCourseAndDependents } from "@graph/profile"
import { BaseStudentProfile, StudentProfile } from "@graph/types"
import { describe, expect, test } from "bun:test"

const mathProfile: StudentProfile = {
  programs: [],
  semesters: [],
  requiredCourses: [
    "7d02c58e-f2b8-494e-ad9c-9ddc973de80f",
    "cb604716-5332-4835-a798-9f6f23bd2651",
    "478849e5-1358-4f7e-b3d9-b0e224e4de54",
    "1665c198-ca4c-4864-940a-dc30eb56c254",
    "7849821d-82f3-4607-9245-41ed500f4a73"
  ],
  transferCredits: [],
  timeToGraduate: 4,
  currentSemester: 1,
  coursePerSemester: 3
}

const compositionProfile: StudentProfile = {
  programs: [],
  semesters: [],
  requiredCourses: ["0c990f7e-bbb2-4bea-9e50-6bdd1b29af01", "87675174-11fd-4f81-a0b9-6dfc80b1f29b"],
  transferCredits: [],
  timeToGraduate: 4,
  currentSemester: 1,
  coursePerSemester: 3
}

test("base student profile to hydrated profile", async () => {
  const profile = await getStudentProfileFromRequirements(mathProfile)

  const graph = studentProfileToGraph(profile)
  const studentProfile = graphToHydratedStudentProfile(graph, mathProfile)
  expect(profile.semesters).toEqual(studentProfile.semesters)
})

test("base student profile from requirements", async () => {
  const studentProfile = await getStudentProfileFromRequirements(mathProfile)
  // console.log(studentProfile)

  expect(studentProfile.semesters).toHaveLength(4)
  expect(studentProfile.semesters.map(s => s.length)).toEqual([1, 2, 1, 1])
})

describe("pushing classes", () => {
  const lastClassChain = [
    {
      profile: mathProfile,
      classToPush: "7d02c58e-f2b8-494e-ad9c-9ddc973de80f",
      expected: {
        numberSemesters: 5,
        lengthOfEachSemester: [1, 2, 1, 0, 1]
      }
    },
    {
      profile: compositionProfile,
      classToPush: "0c990f7e-bbb2-4bea-9e50-6bdd1b29af01",
      expected: {
        numberSemesters: 3,
        lengthOfEachSemester: [1, 0, 1]
      }
    }
  ]

  test.each(lastClassChain)(
    "last class in chain %#",
    async ({ profile, classToPush, expected }) => {
      const studentProfile = await getStudentProfileFromRequirements({ ...profile })

      const graph = studentProfileToGraph(studentProfile)
      // push last class in chain
      const updated = pushCourseAndDependents(graph, classToPush)
      const semesters = buildSemesters(updated)
      expect(semesters).toHaveLength(expected.numberSemesters)
      expect(semesters.map(semester => semester.length)).toEqual(expected.lengthOfEachSemester)
    }
  )

  const firstClassChain = [
    {
      profile: mathProfile,
      classToPush: "1665c198-ca4c-4864-940a-dc30eb56c254",
      expected: {
        semesters: [
          [],
          ["1665c198-ca4c-4864-940a-dc30eb56c254"],
          ["478849e5-1358-4f7e-b3d9-b0e224e4de54", "7849821d-82f3-4607-9245-41ed500f4a73"],
          ["cb604716-5332-4835-a798-9f6f23bd2651"],
          ["7d02c58e-f2b8-494e-ad9c-9ddc973de80f"]
        ]
      }
    },
    {
      profile: compositionProfile,
      classToPush: "87675174-11fd-4f81-a0b9-6dfc80b1f29b",
      expected: {
        semesters: [
          [],
          ["87675174-11fd-4f81-a0b9-6dfc80b1f29b"],
          ["0c990f7e-bbb2-4bea-9e50-6bdd1b29af01"]
        ]
      }
    }
  ]

  test.each(firstClassChain)(
    "first class in chain %#",
    async ({ profile, classToPush, expected }) => {
      const studentProfile = await getStudentProfileFromRequirements({ ...profile })
      const graph = studentProfileToGraph(studentProfile)
      // push last class in chain
      const updated = pushCourseAndDependents(graph, classToPush)
      const semesters = buildSemesters(updated)
      expect(semesters).toHaveLength(expected.semesters.length)
      expect(
        semesters.map((semester, i) => {
          expect(semester.map(c => c.id)).toEqual(expected.semesters[i])
        })
      )
    }
  )
})

const csProfile: BaseStudentProfile = {
  programs: [ProgramOption.CS],
  requiredCourses: [],
  transferCredits: [],
  timeToGraduate: 4,
  currentSemester: 1,
  coursePerSemester: 5
}

test("test blob", async () => {
  const cs = await getStudentProfileFromRequirements(csProfile)
  console.log(cs.semesters.map(s => s.length))
  expect(cs.semesters.map(s => s.length)).toEqual([5, 5, 5, 5, 5, 5, 3])
})
