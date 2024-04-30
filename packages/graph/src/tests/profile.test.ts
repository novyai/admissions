import { ProgramOption } from "@graph/defaultCourses"
import { buildSemesters, studentProfileToGraph } from "@graph/graph"
import { getStudentProfileFromRequirements, pushCourseAndDependents } from "@graph/profile"
import { BaseStudentProfile, HydratedStudentProfile, StudentProfile } from "@graph/types"
import { ChangeType } from "@repo/constants"
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
  coursePerSemester: 3,
  startDate: "Fall 2020"
}

const compositionProfile: StudentProfile = {
  programs: [],
  semesters: [],
  requiredCourses: ["0c990f7e-bbb2-4bea-9e50-6bdd1b29af01", "87675174-11fd-4f81-a0b9-6dfc80b1f29b"],
  transferCredits: [],
  timeToGraduate: 4,
  currentSemester: 1,
  coursePerSemester: 3,
  startDate: "Fall 2020"
}

const removeGenEdProgram = (profile: HydratedStudentProfile) => {
  profile.programs = profile.programs.filter(program => program === "GEN")

  const genEdCourseIDs: string[] = []
  for (const [courseID, course] of profile.graph.entries()) {
    if (course.programs?.includes("GEN")) {
      genEdCourseIDs.push(courseID)
      profile.graph.delete(courseID)
    }
  }
  profile.semesters = profile.semesters.map(courses =>
    courses.filter(course => !course.programs?.includes("GEN"))
  )
  profile.requiredCourses = profile.requiredCourses.filter(
    courseID => !genEdCourseIDs.includes(courseID)
  )
}

test("base student profile from requirements", async () => {
  const studentProfile = await getStudentProfileFromRequirements(mathProfile)
  removeGenEdProgram(studentProfile)

  expect(studentProfile.semesters).toHaveLength(4)
  const semestersId = studentProfile.semesters.map(s => s.map(c => c.id).sort())

  expect(semestersId).toEqual([
    ["1665c198-ca4c-4864-940a-dc30eb56c254"],
    ["478849e5-1358-4f7e-b3d9-b0e224e4de54"],
    ["7849821d-82f3-4607-9245-41ed500f4a73", "cb604716-5332-4835-a798-9f6f23bd2651"],
    ["7d02c58e-f2b8-494e-ad9c-9ddc973de80f"]
  ])
})

describe("pushing classes", () => {
  const movingClasses = [
    {
      profile: mathProfile,
      classToPush: "1665c198-ca4c-4864-940a-dc30eb56c254",
      expected: {
        semesters: [
          [],
          ["1665c198-ca4c-4864-940a-dc30eb56c254", "478849e5-1358-4f7e-b3d9-b0e224e4de54"],
          ["7849821d-82f3-4607-9245-41ed500f4a73", "cb604716-5332-4835-a798-9f6f23bd2651"],
          ["7d02c58e-f2b8-494e-ad9c-9ddc973de80f"]
        ],
        changes: [
          {
            type: ChangeType.Move,
            courseId: "1665c198-ca4c-4864-940a-dc30eb56c254",
            semester: 1
          }
        ]
      }
    },
    {
      profile: mathProfile,
      classToPush: "478849e5-1358-4f7e-b3d9-b0e224e4de54",
      expected: {
        semesters: [
          ["1665c198-ca4c-4864-940a-dc30eb56c254"],
          [],
          [
            "478849e5-1358-4f7e-b3d9-b0e224e4de54",
            "7849821d-82f3-4607-9245-41ed500f4a73",
            "cb604716-5332-4835-a798-9f6f23bd2651"
          ],
          ["7d02c58e-f2b8-494e-ad9c-9ddc973de80f"]
        ],
        changes: [
          {
            courseId: "478849e5-1358-4f7e-b3d9-b0e224e4de54",
            semester: 2,
            type: ChangeType.Move
          }
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
        ],
        changes: [
          {
            type: ChangeType.Move,
            courseId: "87675174-11fd-4f81-a0b9-6dfc80b1f29b",
            semester: 1
          }
        ]
      }
    },
    // first class in chain
    {
      profile: mathProfile,
      classToPush: "7d02c58e-f2b8-494e-ad9c-9ddc973de80f",
      expected: {
        semesters: [
          ["1665c198-ca4c-4864-940a-dc30eb56c254"],
          ["478849e5-1358-4f7e-b3d9-b0e224e4de54"],
          ["7849821d-82f3-4607-9245-41ed500f4a73", "cb604716-5332-4835-a798-9f6f23bd2651"],
          [],
          ["7d02c58e-f2b8-494e-ad9c-9ddc973de80f"]
        ],
        changes: [
          {
            type: ChangeType.Move,
            courseId: "7d02c58e-f2b8-494e-ad9c-9ddc973de80f",
            semester: 4
          }
        ]
      }
    },
    {
      profile: compositionProfile,
      classToPush: "0c990f7e-bbb2-4bea-9e50-6bdd1b29af01",
      expected: {
        semesters: [
          ["87675174-11fd-4f81-a0b9-6dfc80b1f29b"],
          [],
          [],
          ["0c990f7e-bbb2-4bea-9e50-6bdd1b29af01"]
        ],
        changes: [
          {
            type: ChangeType.Move,
            courseId: "0c990f7e-bbb2-4bea-9e50-6bdd1b29af01",
            semester: 3
          }
        ]
      }
    }
  ]

  test.each(movingClasses)(
    "moving classes in chain %#",
    async ({ profile, classToPush, expected }) => {
      const studentProfile = await getStudentProfileFromRequirements({ ...profile })
      removeGenEdProgram(studentProfile)
      const graph = studentProfileToGraph(studentProfile)
      // push last class in chain

      const updated = pushCourseAndDependents(graph, studentProfile, classToPush)
      const semesters = buildSemesters(updated.graph)

      const semesterIds = semesters.map(semester => semester.map(c => c.id).sort())
      expect(semesterIds).toEqual(expected.semesters.map(s => s.sort()))
      expect(updated.changes.sort()).toEqual(expected.changes.sort())
    }
  )
})

const csProfile: BaseStudentProfile = {
  programs: [ProgramOption.CS],
  requiredCourses: [],
  transferCredits: [],
  timeToGraduate: 4,
  currentSemester: 1,
  coursePerSemester: 5,
  startDate: "Fall 2020"
}

test("test blob", async () => {
  const cs = await getStudentProfileFromRequirements(csProfile)
  removeGenEdProgram(cs)
  const semestersId = cs.semesters.map(s => s.map(c => c.id).sort())
  expect(semestersId).toEqual([
    [
      "1665c198-ca4c-4864-940a-dc30eb56c254",
      "23513c34-8285-432a-abe6-ec5daf607749",
      "87675174-11fd-4f81-a0b9-6dfc80b1f29b",
      "e40a5a17-fe90-4b8b-b75d-c41e508d74f9"
    ],
    [
      "0c990f7e-bbb2-4bea-9e50-6bdd1b29af01",
      "3452a5ee-05d1-481c-862e-3bde4ba1b053",
      "478849e5-1358-4f7e-b3d9-b0e224e4de54",
      "bd0e27c5-633c-4ad5-ae93-fb37d08337f0"
    ],
    [
      "255afda2-4965-49d5-aec7-5d824295b44a",
      "4b86edaa-168d-4289-aed4-0c43e1df75e4",
      "6ce2a45d-749d-4695-8d7b-29961e38f1c6",
      "d5579777-e77b-4ccf-adad-b5ab077ad923"
    ],
    [
      "959a8d60-17b9-4935-a8b1-a19c22542d72",
      "99f7b5df-6526-4753-b198-3e305c4ece27",
      "cb604716-5332-4835-a798-9f6f23bd2651",
      "e4079bdf-1c24-4d89-8aaf-5e18ff5229b8"
    ],
    [
      "1646a047-fde8-4a74-926e-edda5637fd8a",
      "7dc1d852-e63a-4a6a-b1db-ed439f443613",
      "8006ca5b-0b8b-468e-b93f-03638d1af728",
      "b1538e5f-3fdf-4e8e-822f-683e9214f4e2",
      "bbd24f53-921a-404d-818d-2e2e54373dba"
    ],
    ["1937e508-681d-4ea9-87fd-29e51156d21d", "840c70bd-ba85-44ef-93bd-23168cbb86a5"],
    [
      "228aaf66-88c4-47f7-b8d7-b6513bfee507",
      "35d262c2-e64f-4585-9330-7502d7c27500",
      "538c9b78-c543-45e9-a91b-4dfe9573c688",
      "5a41371b-3275-4507-8dc4-5f75a7186fac",
      "ddb93b70-f341-4418-96b5-fdb76e393bc0"
    ],
    [
      "1736ce47-8b96-447d-b026-6ae3ad8e3680",
      "324964e7-e3ba-491c-8be8-26bd856a5842",
      "34db46b5-f7d7-4c21-99b0-ba3ca06e0633",
      "5820b8cd-753d-4f70-8d4c-a799611bd867",
      "83d19db2-f7c4-4a7e-9c52-b6268af8a7b7"
    ]
  ])
})
