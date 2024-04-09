import Prisma, { ConditionGroup, db } from "@repo/db"
import Graph from "graphology"
import { forEachTopologicalGeneration, topologicalGenerations } from "graphology-dag"
import { reverse } from "graphology-operators"
import { Attributes } from "graphology-types"

import {
  _getAllDependents,
  buildSemesters,
  getAllDependents,
  getAllPrereqs,
  graphToStudentProfile,
  studentProfileToGraph
} from "./graph"
import { _canMoveCourse, canMoveCourse } from "./schedule"
import { BaseStudentProfile, CourseNode, StudentProfile } from "./types"

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

const COURSE_PAYLOAD = {
  select: {
    name: true,
    id: true,
    conditions: {
      select: {
        conditions: {
          select: {
            prerequisites: true
          }
        }
      }
    }
  }
}

export const addCourseToGraph = ({
  courseId,
  graph,
  courseMap
}: {
  courseId: string
  graph: CourseGraph
  courseMap: Map<string, Prisma.CourseGetPayload<typeof COURSE_PAYLOAD>>
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

  course.conditions.forEach(conditionGroup => {
    conditionGroup.conditions.forEach(condition => {
      condition.prerequisites.forEach(prerequisite => {
        if (courseIsCompleted) {
          completedCourseIds.push(prerequisite.courseId)
        }

        addCourseToGraph({
          courseId: prerequisite.courseId,
          graph,
          courseMap
        })

        if (!graph.hasDirectedEdge(prerequisite.courseId, course.id)) {
          graph.addDirectedEdge(prerequisite.courseId, course.id)
        }
      })
    })
  })
}

/**
 * Load all courses into a student's profile and build their schedule
 * @param profile the basic information about the student's profile
 */
export const getStudentProfileFromRequirements = async (
  profile: BaseStudentProfile
): Promise<StudentProfile> => {
  const graph: CourseGraph = new Graph()

  const requiredCoursesData = await db.course.findMany({
    where: {
      id: {
        in: profile.requiredCourses
      }
    },
    include: {
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

  const courseMap = new Map<
    string,
    Prisma.CourseGetPayload<{
      include: {
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
    }>
  >()

  requiredCoursesData.forEach(course => {
    courseMap.set(course.id, course)
  })

  profile.requiredCourses.forEach(courseId => {
    addCourseToGraph({
      courseId,
      graph,
      courseMap
    })
  })

  computeNodeStats(graph, profile)
  scheduleCourses(graph, profile)

  // graph.forEachNode((_courseId, course) => {
  //   console.log(
  //     `${course.name} -- earliestFinish: ${course.earliestFinish} latestFinish: ${course.latestFinish} fanOut: ${course.fanOut} semester: ${course.semester}`
  //   )
  // })

  return graphToStudentProfile(graph, profile)
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

async function countRequiredCoursesinConditionGroup(
  conditionGroup: ConditionGroup & {
    conditions: { prerequisites: { id: string; conditionId: string; courseId: string }[] }[]
  },
  profile: BaseStudentProfile
): Promise<number> {
  const conditionCounts: number[] = await Promise.all(
    conditionGroup.conditions
      .filter(condition => condition.prerequisites.length > 0)
      .map(
        async condition =>
          await countRequiredCoursesInPrerequisiteTree(
            condition.prerequisites[0]!.courseId,
            profile
          )
      )
  )

  if (conditionGroup.logicalOperator === "OR") {
    return Math.max(...conditionCounts, 0)
  } else {
    return conditionCounts.reduce((acc, curr) => acc + curr, 0)
  }
}

async function countRequiredCoursesInPrerequisiteTree(
  courseId: string,
  profile: BaseStudentProfile
): Promise<number> {
  const course = await getCourseWithPreqs(courseId)
  if (course === null) {
    return 0
  }
  const conditionGroupCounts: number[] = await Promise.all(
    course.conditions.map(conditionGroup =>
      countRequiredCoursesinConditionGroup(conditionGroup, profile)
    )
  )
  return (profile.requiredCourses.includes(courseId) ? 1 : 0) + Math.max(...conditionGroupCounts, 0)
}

export function computeNodeStats(graph: CourseGraph, profile: BaseStudentProfile) {
  let semester = 1
  forEachTopologicalGeneration(graph, coursesInGeneration => {
    coursesInGeneration.forEach(courseId => {
      if (semester === 1) {
        calculateFanOut(graph, courseId)
      }
      graph.setNodeAttribute(courseId, "earliestFinish", semester)
    })
    semester += 1
  })

  semester = profile.timeToGraduate
  forEachTopologicalGeneration(reverse(graph), coursesInGeneration => {
    coursesInGeneration.forEach(courseId => {
      graph.setNodeAttribute(courseId, "latestFinish", semester)
      graph.setNodeAttribute(
        courseId,
        "slack",
        semester - (graph.getNodeAttribute(courseId, "earliestFinish") ?? 0)
      )
    })

    semester -= 1
  })
}
/**
 * Calculates the number of courses that are are dependent on the given course, including dependents of dependents
 * @param graph
 * @param courseId
 * @returns
 */
function calculateFanOut(graph: CourseGraph, courseId: string): number {
  const fanOut = graph
    .mapOutboundNeighbors(courseId, dependingCourseId => {
      return calculateFanOut(graph, dependingCourseId) + 1
    })
    .reduce((acc, val) => acc + val, 0)
  graph.setNodeAttribute(courseId, "fanOut", fanOut)
  return fanOut
}

/**
 * Schedules all of the courses in Graph based on the settings in profile by adding a semester attribute
 * to each node
 * @param graph
 * @param profile
 */
function scheduleCourses(graph: CourseGraph, profile: BaseStudentProfile) {
  var currentSemester = 0
  var coursesInCurrentSemester = 0
  var firstDeferredCourseId = null

  const sortedCourses = topologicalGenerations(graph).flatMap(courseGeneration =>
    courseGeneration
      .map(courseId => graph.getNodeAttributes(courseId))
      .sort((courseA, courseB) => (courseA.slack ?? 0) - (courseB.slack ?? 0))
  )

  while (sortedCourses.length > 0) {
    const course = sortedCourses.shift()!

    // check if the semester is full already and increment if it is
    if (
      coursesInCurrentSemester >= profile.coursePerSemester ||
      course["id"] === firstDeferredCourseId
    ) {
      // console.log(`Semester ${currentSemester} complete`)
      currentSemester += 1
      coursesInCurrentSemester = 0
      firstDeferredCourseId = null
    }

    if (
      graph
        .mapInNeighbors(course.id, (_prereqId, prereq) => prereq.semester)
        .every(semester => semester! < currentSemester)
    ) {
      // if all of the prereqs were completed in previous semesters, we can add this course to the current one
      // console.log(`Adding ${course["name"]} to schedule in semester ${currentSemester}`)
      graph.setNodeAttribute(course["id"], "semester", currentSemester)
      coursesInCurrentSemester += 1
    } else {
      // otherwise we need to defer this course
      // console.log(`Deferring ${course["name"]} to schedule in semester ${currentSemester}`)
      if (firstDeferredCourseId === null) {
        firstDeferredCourseId = course["id"]
      }
      sortedCourses.push(course)
    }
  }
}

export function toCourseNode(
  graph: Graph,
  courseId: string,
  course: Attributes | undefined
): CourseNode {
  if (!course) {
    course = graph.getNodeAttributes(courseId)
  }
  return {
    id: courseId,
    name: course["name"],

    earliestFinish: course["earliestFinish"],
    latestFinish: course["latestFinish"],
    fanOut: course["fanOut"],

    dependents: graph.mapOutboundNeighbors(courseId, dependentId => dependentId),
    prerequisites: graph.mapInboundNeighbors(courseId, prereqId => prereqId)
  }
}

/**
 * Pushes a course and all of its dependents to a later semester while keeping a valid schedule.
 * @param graph The course graph.
 * @param profile The student profile containing scheduling constraints.
 * @param courseId The ID of the course to be pushed.
 */
export function pushCourseAndDependents(graph: CourseGraph, courseId: string) {
  // Step 1: Identify the Course and Its Dependents
  const dependents = _getAllDependents(courseId, graph)

  // Step 2: Next semester
  const currSemesterIndex = graph.getNodeAttribute(courseId, "semester")
  if (currSemesterIndex === undefined) {
    throw new Error(`Could not move ${courseId} because it has no semester`)
  }
  const nextSemesterIndex = currSemesterIndex + 1

  // if no courses depend on it, just push it a semester that makes sense
  if (dependents.length === 0) {
    const mv = _canMoveCourse(courseId, nextSemesterIndex, graph)
    if (mv.canMove) {
      graph.setNodeAttribute(courseId, "semester", nextSemesterIndex)
    } else {
      throw new Error(`Could not move ${courseId} because of ${mv.reason}`)
    }

    return graph
  }

  // if there are courses that depend on it, we need to find the earliest semester that they can all be pushed to

  // Step 3: Update the Course and Dependents

  let mv = _canMoveCourse(courseId, nextSemesterIndex, graph)
  while (!mv.canMove) {
    // if there is a dependent issue, push them
    if (mv.reason.type === "dependent") {
      mv.reason.courseId.forEach(depId => {
        graph = pushCourseAndDependents(graph, depId)
        console.log(
          "after moving",
          graph.getNodeAttribute(depId, "name"),
          "to",
          graph.getNodeAttribute(depId, "semester")
        )
      })
      mv = _canMoveCourse(courseId, nextSemesterIndex, graph)
      continue
    }

    throw new Error(`Could not move ${courseId} because of ${JSON.stringify(mv.reason)}`)
  }

  // now we can move:
  if (mv.canMove) {
    graph.setNodeAttribute(courseId, "semester", nextSemesterIndex)
  }

  return graph
}
