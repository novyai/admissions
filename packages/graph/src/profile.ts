import { Change, ChangeType } from "@repo/constants"
import { db } from "@repo/db"
import Graph from "graphology"
import { topologicalGenerations } from "graphology-dag"
import { Attributes } from "graphology-types"

import { addCourseToGraph, COURSE_PAYLOAD_QUERY, CourseGraph, CoursePayload } from "./course"
import { Program, programHandler } from "./defaultCourses"
import { _getAllDependents, graphToHydratedStudentProfile } from "./graph"
import { _canMoveCourse } from "./schedule"
import { computeNodeStats } from "./stats"
import { BaseStudentProfile, CourseNode, StudentProfile } from "./types"

export const getCoursesForProgram = async (program: Program) => {
  const { requiredCourses, extraToQuery } = programHandler[program]

  return {
    program,
    requiredCourses:
      requiredCourses &&
      (await db.course.findMany({
        where: requiredCourses,
        ...COURSE_PAYLOAD_QUERY
      })),
    extraToQuery:
      extraToQuery &&
      (await db.course.findMany({
        where: extraToQuery,
        ...COURSE_PAYLOAD_QUERY
      }))
  }
}

export async function createGraph(profile: StudentProfile): Promise<CourseGraph> {
  const graph: CourseGraph = new Graph()
  const programCourseData = await Promise.all(profile.programs.map(p => getCoursesForProgram(p)))

  const requiredCoursesNotInProgram = await db.course.findMany({
    where: {
      id: {
        in: profile.requiredCourses
      }
    },
    ...COURSE_PAYLOAD_QUERY
  })

  const courseMap = new Map<string, CoursePayload>()

  const allRequiredCourses = [...profile.requiredCourses]

  programCourseData.forEach(program => {
    program.requiredCourses?.forEach(course => {
      allRequiredCourses.push(course.id)
      courseMap.set(course.id, course)
    })
    program.extraToQuery?.forEach(course => {
      courseMap.set(course.id, course)
    })
  })

  requiredCoursesNotInProgram.forEach(course => {
    courseMap.set(course.id, course)
  })

  programCourseData.forEach(program => {
    program.requiredCourses?.forEach(course => {
      addCourseToGraph({
        courseId: course.id,
        graph,
        courseMap,
        requiredCourses: allRequiredCourses
      })
    })
    program.extraToQuery?.forEach(course => {
      addCourseToGraph({
        courseId: course.id,
        graph,
        courseMap,
        requiredCourses: allRequiredCourses
      })
    })
  })

  requiredCoursesNotInProgram.map(c =>
    addCourseToGraph({
      courseId: c.id,
      graph,
      courseMap,
      requiredCourses: allRequiredCourses
    })
  )

  profile.semesters.forEach((sem, i) => {
    sem.forEach(c => graph.setNodeAttribute(c, "semester", i))
  })

  return graph
}

/**
 * Load all courses into a student's profile and build their schedule
 * @param profile the basic information about the student's profile
 */
export const getStudentProfileFromRequirements = async (profile: BaseStudentProfile) => {
  const graph = await createGraph({ ...profile, semesters: [] })
  computeNodeStats(graph, profile)
  scheduleCourses(graph, profile)
  return graphToHydratedStudentProfile(graph, profile)
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
      .sort((courseA, courseB) => courseA.slack! ?? 0 - courseB.slack! ?? 0)
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
  const changes: Change[] = []
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
      changes.push({ type: ChangeType.Move, courseId, semester: nextSemesterIndex })
    } else {
      throw new Error(`Could not move ${courseId} because of ${mv.reason}`)
    }

    return {
      graph,
      changes
    }
  }

  // if there are courses that depend on it, we need to find the earliest semester that they can all be pushed to

  // Step 3: Update the Course and Dependents

  let mv = _canMoveCourse(courseId, nextSemesterIndex, graph)
  while (!mv.canMove) {
    // if there is a dependent issue, push them
    if (mv.reason.type === "dependent") {
      mv.reason.courseId.forEach(depId => {
        const { graph: newGraph, changes: newChanges } = pushCourseAndDependents(graph, depId)
        graph = newGraph
        changes.push(...newChanges)
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
    changes.push({ type: ChangeType.Move, courseId, semester: nextSemesterIndex })
  }

  return {
    graph,
    changes
  }
}
