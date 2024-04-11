import { addCourseToGraph, COURSE_PAYLOAD_QUERY, CourseGraph } from "@graph/course"
import { Prisma, RequirementType } from "@repo/db"
import { describe, expect, test } from "bun:test"
import Graph from "graphology"

describe("addCourseToGraph function", () => {
  test("adds a new course node to the graph", async () => {
    const graph = new Graph() as CourseGraph
    const courseMap = new Map<string, Prisma.CourseGetPayload<typeof COURSE_PAYLOAD_QUERY>>()
    const courseId = "test-course-id"
    const courseName = "Test Course"
    courseMap.set(courseId, {
      id: courseId,
      name: courseName,
      conditions: []
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
      semester: undefined
    })
  })

  test("does not add a course node if it already exists in the graph", async () => {
    const graph = new Graph() as CourseGraph
    const courseMap = new Map<string, Prisma.CourseGetPayload<typeof COURSE_PAYLOAD_QUERY>>()
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
      semester: undefined
    })
    const initialNodeCount = graph.order

    addCourseToGraph({
      courseId,
      graph,
      courseMap,
      requiredCourses: []
    })

    expect(graph.order).toBe(initialNodeCount) // No new node should be added
  })
})

const prerequisiteId1 = "prerequisite-1"
const prerequisiteId2 = "prerequisite-2"
const conditions = [
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
      },
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
    const courseMap = new Map<string, Prisma.CourseGetPayload<typeof COURSE_PAYLOAD_QUERY>>()
    const courseId = "course-with-or-condition"

    courseMap.set(courseId, {
      id: courseId,
      name: "Course with OR Condition",
      conditions: [
        {
          logicalOperator: "OR",
          conditions
        }
      ]
    })
    courseMap.set(prerequisiteId1, {
      id: prerequisiteId1,
      name: "Prerequisite 1",
      conditions: []
    })
    courseMap.set(prerequisiteId2, {
      id: prerequisiteId2,
      name: "Prerequisite 2",
      conditions: []
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
  })

  test("handles AND conditions correctly", async () => {
    const graph = new Graph() as CourseGraph
    const courseMap = new Map<string, Prisma.CourseGetPayload<typeof COURSE_PAYLOAD_QUERY>>()
    const courseId = "course-with-and-condition"
    const prerequisiteId1 = "prerequisite-1"
    const prerequisiteId2 = "prerequisite-2"

    courseMap.set(courseId, {
      id: courseId,
      name: "Course with AND Condition",
      conditions: [
        {
          logicalOperator: "AND",
          conditions
        }
      ]
    })
    courseMap.set(prerequisiteId1, {
      id: prerequisiteId1,
      name: "Prerequisite 1",
      conditions: []
    })
    courseMap.set(prerequisiteId2, {
      id: prerequisiteId2,
      name: "Prerequisite 2",
      conditions: []
    })

    addCourseToGraph({
      courseId,
      graph,
      courseMap,
      requiredCourses: []
    })

    // Expect the graph to have nodes for the course and both prerequisites
    expect(graph.hasNode(courseId)).toBe(true)
    expect(graph.hasNode(prerequisiteId1) && graph.hasNode(prerequisiteId2)).toBe(true)
  })
})
