import Prisma, { db, RequirementType } from "@repo/db"
import Graph from "graphology"
import { Attributes } from "graphology-types"

import {
  countRequiredCoursesInConditionGroup,
  countRequiredCoursesInPrerequisiteTree
} from "./conditions"
import { HydratedStudentProfile } from "./types"

export const getCourseWithPrereqs = async (courseId: string, queriedCourses: string[] = []) => {
  // pull in current course
  const course = await db.course.findUnique({
    where: {
      id: courseId
    },
    include: {
      department: true,
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

  if (!course) {
    throw new Error("Course not found")
  }

  // dedup prereq courses
  const prereqsCourses = new Set(
    course.conditions.flatMap(c => c.conditions.flatMap(c => c.prerequisites.map(p => p.courseId)))
  )

  // remove circular dependencies from the query
  const filteredPrereqsCourses = new Set(
    [...prereqsCourses].filter(c => !queriedCourses.includes(c))
  )

  const prereqMap = new Map([[course.id, Array.from(filteredPrereqsCourses)]])
  if (filteredPrereqsCourses.size === 0) {
    return {
      course,
      prereqMap,
      dependentMap: new Map<string, string[]>()
    }
  }

  let newQueriedCourses = [...queriedCourses, course.id]
  for (const courseId of filteredPrereqsCourses) {
    newQueriedCourses = [...queriedCourses, courseId]
    const { prereqMap: prereqPrereqMap } = await getCourseWithPrereqs(courseId, newQueriedCourses)
    for (const [key, value] of prereqPrereqMap) {
      prereqMap.set(key, value)
    }
  }

  const dependentMap = new Map<string, string[]>()
  for (const [key, value] of prereqMap) {
    for (const course of value) {
      dependentMap.set(course, Array.from(new Set([...(dependentMap.get(course) || []), key])))
    }
  }

  return {
    course,
    prereqMap,
    dependentMap
  }
}

export const getCourseAndSemesterIndexFromIdNameCode = (
  profile: HydratedStudentProfile,
  courseQuery: string
) => {
  const courses = [...profile.graph.values()]

  const course =
    courses.find(c => c.name.toLowerCase() == courseQuery.toLowerCase()) ??
    // courses.find(
    //   c => `${c.raw_course.courseSubject} ${c.raw_course.courseNumber}` == courseQuery
    // ) ??
    courses.find(c => c.id == courseQuery)

  if (course === undefined) {
    throw new Error(`Course ${course} not found in student profile`)
  }

  const semesterIndex = profile.semesters.findIndex(sem => sem.some(c => c.id == course.id))

  return { course, semesterIndex }
}

export type CourseAttributes = {
  semester?: number
  id: string
  name: string
  tracks: string[] | undefined
  requirements: string[] | undefined
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

export type EdgeAttributes = {
  type: RequirementType
}

export type CourseGraph = Graph<CourseAttributes, EdgeAttributes, Attributes>

export const COURSE_PAYLOAD_QUERY = {
  select: {
    name: true,
    id: true,
    creditHours: true,
    requirements: {
      select: {
        id: true,
        track: {
          select: {
            id: true
          }
        }
      }
    },
    conditions: {
      select: {
        logicalOperator: true,
        conditions: {
          select: {
            type: true,
            prerequisites: true
          }
        }
      }
    }
  }
} satisfies Prisma.CourseDefaultArgs

export type CoursePayload = Prisma.CourseGetPayload<typeof COURSE_PAYLOAD_QUERY>

export const addCourseToGraph = ({
  courseId,
  graph,
  courseMap,
  requiredCourses
}: {
  courseId: string
  graph: CourseGraph
  courseMap: Map<string, CoursePayload>
  requiredCourses: string[]
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
    tracks: course.requirements.map(r => r.track.id),
    requirements: course.requirements.map(r => r.id),
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

  if (course.conditions.length === 0) {
    return
  }

  // condition groups are implicitly ORed, so we only need to recurse down one.
  // recurse down the branch that has the most required courses.
  const conditionGroupsWithCounts = course.conditions.map(conditionGroup => ({
    conditionGroup: conditionGroup,
    requiredCoursesInTree: countRequiredCoursesInConditionGroup(
      conditionGroup,
      graph,
      courseMap,
      requiredCourses
    )
  }))

  conditionGroupsWithCounts.sort((a, b) => b.requiredCoursesInTree - a.requiredCoursesInTree)

  const conditionGroup = conditionGroupsWithCounts[0]?.conditionGroup

  if (conditionGroup) {
    // for OR conditions, we only need to recurse down the condition that has the most required courses
    if (conditionGroup.logicalOperator === "OR") {
      pickOrCondition(
        conditionGroup,
        course,
        graph,
        courseMap,
        requiredCourses,
        courseIsCompleted,
        completedCourseIds
      )
    } else {
      // AND CONDITION
      pickAndCondition(
        conditionGroup,
        course,
        graph,
        courseMap,
        requiredCourses,
        courseIsCompleted,
        completedCourseIds
      )
    }
  }
}

function pickOrCondition(
  conditionGroup: CoursePayload["conditions"][number],
  course: CoursePayload,
  graph: CourseGraph,
  courseMap: Map<string, CoursePayload>,
  requiredCourses: string[],
  courseIsCompleted: boolean,
  completedCourseIds: string[]
) {
  const conditionsWithCounts = conditionGroup.conditions
    .filter(condition => condition.prerequisites.length > 0)
    .map(condition => ({
      condition: condition,
      count: countRequiredCoursesInPrerequisiteTree(
        condition.prerequisites[0]!.courseId,
        graph,
        courseMap,
        requiredCourses
      )
    }))

  if (conditionsWithCounts.length === 0) {
    return
  }

  const pickedOrCondition = conditionsWithCounts.reduce((acc, cur) =>
    cur.count > acc.count ? cur : acc
  )

  for (const prerequisite of pickedOrCondition.condition.prerequisites) {
    // if a course is completed, assume that it's prerequisites are completed
    if (courseIsCompleted) {
      completedCourseIds.push(prerequisite.courseId)
    }

    addCourseToGraph({
      courseId: prerequisite.courseId,
      graph,
      courseMap,
      requiredCourses
    })

    // edges represent prerequisites pointing at the course they are a prerequisite for
    if (!graph.hasDirectedEdge(prerequisite.courseId, course.id)) {
      graph.addDirectedEdge(prerequisite.courseId, course.id, {
        type: pickedOrCondition.condition.type
      })
    }
  }
}

function pickAndCondition(
  conditionGroup: CoursePayload["conditions"][number],
  course: CoursePayload,
  graph: CourseGraph,
  courseMap: Map<string, CoursePayload>,
  requiredCourses: string[],
  courseIsCompleted: boolean,
  completedCourseIds: string[]
) {
  for (const condition of conditionGroup.conditions) {
    for (const prerequisite of condition.prerequisites) {
      // if a course is completed, assume that it's prerequisites are completed
      if (courseIsCompleted) {
        completedCourseIds.push(prerequisite.courseId)
      }

      addCourseToGraph({ courseId: prerequisite.courseId, graph, courseMap, requiredCourses })

      // edges represent prerequisites pointing at the course they are a prerequisite for
      if (!graph.hasDirectedEdge(prerequisite.courseId, course.id)) {
        graph.addDirectedEdge(prerequisite.courseId, course.id, {
          type: condition.type
        })
      }
    }
  }
}

// export async function getCourseIdToPrequisitesMap(
//   courseIds: string[],
//   profile: HydratedStudentProfile
// ): Promise<Map<string, PrequisiteInfo[]>> {
//   const coursesWithPrerequisites = await db.course.findMany({
//     select: {
//       id: true,
//       prerequisites: {
//         select: {
//           condition: { select: { type: true } },
//           course: {
//             select: {
//               id: true,
//               name: true,
//               courseNumber: true,
//               courseSubject: true
//             }
//           }
//         }
//       }
//     },
//     where: { id: { in: courseIds } }
//   })

//   const courseIdToPrerequisites = new Map<string, PrequisiteInfo[]>()
//   for (const course of coursesWithPrerequisites) {
//     const prerequisites: PrequisiteInfo[] = course.prerequisites.map(prereq => ({
//       ...prereq.course,
//       type: prereq.condition.type,
//       planned: doesProfileContainCourse(profile, prereq.course.id)
//     }))
//     courseIdToPrerequisites.set(course.id, prerequisites)
//   }
//   return courseIdToPrerequisites
// }
