import { addCourseToGraph, CourseGraph, CoursePayload } from "@graph/course"
import { buildSemesters } from "@graph/graph"
import { scheduleCourses } from "@graph/schedule"
import { computeNodeStats } from "@graph/stats"
import { RequirementType } from "@repo/db"
import { describe, expect, test } from "bun:test"
import Graph from "graphology"

const baseProfile = {
  requiredCourses: [],
  transferCredits: [],
  tracks: [],
  timeToGraduate: 0,
  currentSemester: 0,
  coursePerSemester: 5,
  startDate: "Fall 2020"
}

describe("addCourseToGraph function", () => {
  test("adds a new course node to the graph", async () => {
    const graph = new Graph() as CourseGraph
    const courseMap = new Map<string, CoursePayload>()
    const courseId = "test-course-id"
    const courseName = "Test Course"
    courseMap.set(courseId, {
      id: courseId,
      name: courseName,
      conditions: [],
      tracks: []
    })

    addCourseToGraph({
      courseId,
      graph,
      courseMap,
      requiredCourses: []
    })

    expect(graph.hasNode(courseId)).toBe(true)
    const nodeAttributes = graph.getNodeAttributes(courseId)
    expect(nodeAttributes).toEqual({
      id: courseId,
      name: courseName,
      hasAttributes: false,
      fanOut: undefined,
      earliestFinish: undefined,
      latestFinish: undefined,
      slack: undefined,
      semester: undefined,
      tracks: []
    })
  })

  test("does not add a course node if it already exists in the graph", async () => {
    const graph = new Graph() as CourseGraph
    const courseMap = new Map<string, CoursePayload>()
    const courseId = "existing-course-id"
    const courseName = "Existing Course"
    graph.addNode(courseId, {
      id: courseId,
      name: courseName,
      hasAttributes: false,
      fanOut: undefined,
      earliestFinish: undefined,
      latestFinish: undefined,
      slack: undefined,
      semester: undefined,
      tracks: []
    })
    const initialNodeCount = graph.order

    addCourseToGraph({
      courseId,
      graph,
      courseMap,
      requiredCourses: []
    })

    expect(graph.order).toBe(initialNodeCount) // No new node should be added

    const newProfile = { ...baseProfile }
    computeNodeStats(graph, newProfile)
    scheduleCourses(graph, newProfile)

    const semesters = buildSemesters(graph)
    expect(semesters.map(semester => semester.map(course => course.id))).toEqual([[courseId]])
  })
})

const prerequisiteId1 = "prerequisite-1"
const prerequisiteId2 = "prerequisite-2"
const prerequisiteConditions = [
  {
    id: "test-condition",
    conditionGroupId: "test-condition-group",
    minimumGrade: "A",
    type: RequirementType.PREREQUISITE,
    prerequisites: [
      {
        courseId: prerequisiteId1,
        id: "prerequisite-1",
        conditionId: "condition-1"
      }
    ]
  },
  {
    id: "test-condition-2",
    conditionGroupId: "test-condition-group",
    minimumGrade: "A",
    type: RequirementType.PREREQUISITE,
    prerequisites: [
      {
        courseId: prerequisiteId2,
        id: "prerequisite-2",
        conditionId: "condition-1"
      }
    ]
  }
]

describe("addCourseToGraph function with AND and OR conditions", () => {
  test("handles OR conditions correctly", async () => {
    const graph = new Graph() as CourseGraph
    const courseMap = new Map<string, CoursePayload>()
    const courseId = "course-with-or-condition"

    courseMap.set(courseId, {
      id: courseId,
      name: "Course with OR Condition",
      tracks: [],
      conditions: [
        {
          logicalOperator: "OR",
          conditions: prerequisiteConditions
        }
      ]
    })
    courseMap.set(prerequisiteId1, {
      id: prerequisiteId1,
      name: "Prerequisite 1",
      conditions: [],
      tracks: []
    })
    courseMap.set(prerequisiteId2, {
      id: prerequisiteId2,
      name: "Prerequisite 2",
      conditions: [],
      tracks: []
    })

    addCourseToGraph({
      courseId,
      graph,
      courseMap,
      requiredCourses: []
    })

    // Expect the graph to have nodes for the course and its prerequisites
    expect(graph.hasNode(courseId)).toBe(true)
    expect(graph.hasNode(prerequisiteId1) || graph.hasNode(prerequisiteId2)).toBe(true)

    const newProfile = { ...baseProfile }
    computeNodeStats(graph, newProfile)
    scheduleCourses(graph, newProfile)

    const semesters = buildSemesters(graph)
    expect(semesters.map(semester => semester.map(course => course.id))).toEqual([
      ["prerequisite-1"],
      ["course-with-or-condition"]
    ])
  })

  test("handles AND conditions correctly", async () => {
    const graph = new Graph() as CourseGraph
    const courseMap = new Map<string, CoursePayload>()
    const courseId = "course-with-and-condition"
    const prerequisiteId1 = "prerequisite-1"
    const prerequisiteId2 = "prerequisite-2"

    courseMap.set(courseId, {
      id: courseId,
      name: "Course with AND Condition",
      conditions: [
        {
          logicalOperator: "AND",
          conditions: prerequisiteConditions
        }
      ],
      tracks: []
    })
    courseMap.set(prerequisiteId1, {
      id: prerequisiteId1,
      name: "Prerequisite 1",
      conditions: [],
      tracks: []
    })
    courseMap.set(prerequisiteId2, {
      id: prerequisiteId2,
      name: "Prerequisite 2",
      conditions: [],
      tracks: []
    })

    addCourseToGraph({
      courseId,
      graph,
      courseMap,
      requiredCourses: [courseId]
    })

    // Expect the graph to have nodes for the course and both prerequisites
    expect(graph.hasNode(courseId)).toBe(true)
    expect(graph.hasNode(prerequisiteId1) && graph.hasNode(prerequisiteId2)).toBe(true)

    const newProfile = { ...baseProfile }
    computeNodeStats(graph, newProfile)
    scheduleCourses(graph, newProfile)

    const semesters = buildSemesters(graph)
    expect(semesters.map(semester => semester.map(course => course.id))).toEqual([
      [prerequisiteId1, prerequisiteId2],
      [courseId]
    ])
  })
})

describe("addCourseToGraph function with corequisite conditions", () => {
  test("handles corequisite conditions correctly", async () => {
    const graph = new Graph() as CourseGraph
    const courseMap = new Map<string, CoursePayload>()
    const courseId = "course-with-corequisite"
    const corequisiteId = "corequisite-1"

    courseMap.set(courseId, {
      id: courseId,
      name: "Course with Corequisite",
      tracks: [],
      conditions: [
        {
          logicalOperator: "OR",
          conditions: [
            {
              type: RequirementType.COREQUISITE,
              prerequisites: [
                {
                  courseId: corequisiteId,
                  id: "corequisite-1",
                  conditionId: "condition-corequisite"
                }
              ]
            }
          ]
        }
      ]
    })
    courseMap.set(corequisiteId, {
      id: corequisiteId,
      name: "Corequisite 1",
      conditions: [],
      tracks: []
    })

    addCourseToGraph({
      courseId,
      graph,
      courseMap,
      requiredCourses: [courseId]
    })

    // Expect the graph to have nodes for the course and its corequisite
    expect(graph.hasNode(courseId)).toBe(true)
    expect(graph.hasNode(corequisiteId)).toBe(true)
    const newProfile = { ...baseProfile }
    computeNodeStats(graph, newProfile)
    scheduleCourses(graph, newProfile)

    const semesters = buildSemesters(graph)
    const semesterIds = semesters.map(semester => semester.map(course => course.id).sort())
    expect(semesterIds).toEqual([[courseId, corequisiteId].sort()])
  })
})
