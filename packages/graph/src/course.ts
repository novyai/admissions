import Prisma, { db } from "@repo/db"
import Graph from "graphology"
import { Attributes } from "graphology-types"

import {
  countRequiredCoursesInConditionGroup,
  countRequiredCoursesInPrerequisiteTree
} from "./conditions"
import { StudentProfile } from "./types"

export const getCourseFromIdNameCode = (profile: StudentProfile, courseQuery: string) => {
  const courses = [...profile.graph.values()]

  const course =
    courses.find(c => c.name == courseQuery) ??
    // courses.find(
    //   c => `${c.raw_course.courseSubject} ${c.raw_course.courseNumber}` == courseQuery
    // ) ??
    courses.find(c => c.id == courseQuery)

  if (course === undefined) {
    throw Error(`Course ${course} not found in student profile`)
  }

  return course
}

type CourseAttributes = {
  semester?: number
  id: string
  name: string
} & (
  | {
      hasAttributes: false
      fanOut: undefined
      earliestFinish: undefined
      latestFinish: undefined
      slack: undefined
    }
  | {
      hasAttributes: true
      fanOut: number
      earliestFinish: number
      latestFinish: number
      slack: number
    }
)

export type CourseGraph = Graph<CourseAttributes, Attributes, Attributes>

export const COURSE_PAYLOAD_QUERY = {
  select: {
    name: true,
    id: true,
    conditions: {
      select: {
        logicalOperator: true,
        conditions: {
          include: {
            prerequisites: true
          }
        }
      }
    }
  }
}

export type CoursePayload = Prisma.CourseGetPayload<typeof COURSE_PAYLOAD_QUERY>

export const addCourseToGraph = ({
  courseId,
  graph,
  courseMap
}: {
  courseId: string
  graph: CourseGraph
  courseMap: Map<string, Prisma.CourseGetPayload<typeof COURSE_PAYLOAD_QUERY>>
}) => {
  if (graph.hasNode(courseId)) {
    return
  }

  const completedCourseIds: string[] = []
  const course = courseMap.get(courseId)

  if (!course) {
    throw new Error(`Course not found ${courseId}`)
  }

  graph.addNode(courseId, {
    id: course.id,
    name: course.name,
    hasAttributes: false,
    fanOut: undefined,
    earliestFinish: undefined,
    latestFinish: undefined,
    slack: undefined
  })

  const courseIsCompleted = completedCourseIds.includes(courseId)

  if (courseIsCompleted) {
    graph.setNodeAttribute(courseId, "semester", 0)
  }

  // ANDREW
  // condition groups are implicitly ORed, so we only need to recurse down one.
  // recurse down the branch that has the most required courses.
  const conditionGroupsWithCounts = course.conditions.map(conditionGroup => ({
    conditionGroup: conditionGroup,
    requiredCoursesInTree: countRequiredCoursesInConditionGroup(conditionGroup, graph, courseMap)
  }))

  conditionGroupsWithCounts.sort((a, b) => b.requiredCoursesInTree - a.requiredCoursesInTree)

  const conditionGroup = conditionGroupsWithCounts[0]?.conditionGroup

  if (conditionGroup) {
    // for OR conditions, we only need to recurse down the condition that has the most required courses
    if (conditionGroup.logicalOperator === "OR") {
      const conditionsWithCounts = conditionGroup.conditions
        .filter(condition => condition.prerequisites.length > 0)
        .map(condition => ({
          condition: condition,
          count: countRequiredCoursesInPrerequisiteTree(
            condition.prerequisites[0]!.courseId,
            graph,
            courseMap
          )
        }))

      const prerequisites = conditionsWithCounts.reduce((acc, cur) =>
        cur.count > acc.count ? cur : acc
      ).condition.prerequisites

      for (const prerequisite of prerequisites) {
        // if a course is completed, assume that it's prerequisites are completed
        if (courseIsCompleted) {
          completedCourseIds.push(prerequisite.courseId)
        }

        addCourseToGraph({
          courseId: prerequisite.courseId,
          graph,
          courseMap
        })

        // edges represent prerequisites pointing at the course they are a prerequisite for
        if (!graph.hasDirectedEdge(prerequisite.courseId, course.id)) {
          graph.addDirectedEdge(prerequisite.courseId, course.id)
        }
      }
    } else {
      for (const condition of conditionGroup.conditions) {
        for (const prerequisite of condition.prerequisites) {
          // if a course is completed, assume that it's prerequisites are completed
          if (courseIsCompleted) {
            completedCourseIds.push(prerequisite.courseId)
          }

          addCourseToGraph({ courseId: prerequisite.courseId, graph, courseMap })

          // edges represent prerequisites pointing at the course they are a prerequisite for
          if (!graph.hasDirectedEdge(prerequisite.courseId, course.id)) {
            graph.addDirectedEdge(prerequisite.courseId, course.id)
          }
        }
      }
    }
  }

  // ORGINAL
  // course.conditions.forEach(conditionGroup => {
  //   conditionGroup.conditions.forEach(condition => {
  //     condition.prerequisites.forEach(prerequisite => {
  //       if (courseIsCompleted) {
  //         completedCourseIds.push(prerequisite.courseId)
  //       }

  //       addCourseToGraph({
  //         courseId: prerequisite.courseId,
  //         graph,
  //         courseMap
  //       })

  //       if (!graph.hasDirectedEdge(prerequisite.courseId, course.id)) {
  //         graph.addDirectedEdge(prerequisite.courseId, course.id)
  //       }
  //     })
  //   })
  // })
}

async function getCourseWithPreqs(courseId: string) {
  return db.course.findUnique({
    where: {
      id: courseId
    },
    select: {
      id: true,
      courseNumber: true,
      courseSubject: true,
      name: true,
      departmentId: true,
      universityId: true,
      conditions: {
        include: {
          conditions: {
            include: {
              prerequisites: true
            }
          }
        }
      }
    }
  })
}
