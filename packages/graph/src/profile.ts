import { Change, ChangeType } from "@repo/constants"
import { db, RequirementType } from "@repo/db"
import Graph from "graphology"
import { topologicalGenerations } from "graphology-dag"
import { Attributes } from "graphology-types"

import { addCourseToGraph, COURSE_PAYLOAD_QUERY, CourseGraph, CoursePayload } from "./course"
import { Program, programHandler } from "./defaultCourses"
import { _getAllDependents, graphToHydratedStudentProfile } from "./graph"
import { _canMoveCourse } from "./schedule"
import { computeNodeStats } from "./stats"
import { BaseStudentProfile, CourseNode, StudentProfile } from "./types"

const GEN_ED_PROGRAM = {
  program: "GEN" as Program,
  requiredCourses: [
    {
      id: "GEN-SGEH",
      name: "Gen Ed Core Humanities",
      conditions: []
    },
    {
      id: "GEN-SGEM",
      name: "Gen Ed Core Mathematics",
      conditions: []
    },
    {
      id: "GEN-SGEN",
      name: "Gen Ed Core Natural Sciences",
      conditions: []
    },
    {
      id: "GEN-SGES",
      name: "Gen Ed Core Social Sciences",
      conditions: []
    },
    {
      id: "GEN-TGEC",
      name: "Gen Ed Creative Thinking",
      conditions: []
    },
    {
      id: "GEN-TGEI",
      name: "Gen Ed Information & Data Literacy",
      conditions: []
    },
    {
      id: "GEN-TGED",
      name: "Gen Ed Human & Cultural Diversity",
      conditions: []
    },
    {
      id: "GEN-TGEH",
      name: "Gen Ed High Impact Practice",
      conditions: []
    }
  ],
  extraToQuery: undefined
}

export const getCoursesForProgram = async (
  program: Program
): Promise<{
  program: Program
  requiredCourses: CoursePayload[] | undefined
  extraToQuery: CoursePayload[] | undefined
}> => {
  const { requiredCourses: requiredCoursesWhereInput, extraToQuery: extraToQueryWhereInput } =
    programHandler[program]

  if (program == "GEN") {
    return {
      ...GEN_ED_PROGRAM,
      requiredCourses: GEN_ED_PROGRAM.requiredCourses.map(course => ({
        ...course,
        program: program
      }))
    }
  }

  const requiredCourses =
    requiredCoursesWhereInput !== undefined ?
      await db.course.findMany({
        where: requiredCoursesWhereInput,
        ...COURSE_PAYLOAD_QUERY
      })
    : undefined

  const extraToQueryCourses =
    extraToQueryWhereInput !== undefined ?
      await db.course.findMany({
        where: extraToQueryWhereInput,
        ...COURSE_PAYLOAD_QUERY
      })
    : undefined

  return {
    program,
    requiredCourses: requiredCourses?.map(course => ({
      ...course,
      program: program
    })),
    extraToQuery: extraToQueryCourses?.map(course => ({
      ...course,
      program: program
    }))
  }
}

export async function createGraph(profile: StudentProfile): Promise<CourseGraph> {
  const graph: CourseGraph = new Graph()
  const programsWithGenEd = [...profile.programs, "GEN"] as Program[]
  const programCourseData = await Promise.all(programsWithGenEd.map(p => getCoursesForProgram(p)))

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
export function scheduleCourses(graph: CourseGraph, profile: BaseStudentProfile) {
  let currentSemester: number = 0
  let coursesInCurrentSemester: string[] = []
  let firstDeferredCourseId: string | null = null

  const sortedCourses = topologicalGenerations(graph).flatMap(courseGeneration =>
    courseGeneration
      // don't directly schedule corequisites -- we'll add them when we schedule their parent
      .filter(courseId => {
        const edges = graph.mapOutEdges(courseId, (_, edge) => edge.type)
        return edges.length === 0 || !edges.every(type => type === "COREQUISITE")
      })
      .map(courseId => graph.getNodeAttributes(courseId))
      .sort((courseA, courseB) => courseA.slack! ?? 0 - courseB.slack! ?? 0)
  )

  while (sortedCourses.length > 0) {
    const course = sortedCourses.shift()!

    // check if the semester is full already and increment if it is
    if (
      coursesInCurrentSemester.length >= profile.coursePerSemester ||
      course["id"] === firstDeferredCourseId
    ) {
      // console.log(`Semester ${currentSemester} complete`)
      currentSemester += 1
      coursesInCurrentSemester = []
      firstDeferredCourseId = null
    }

    const allPrereqsCompleted = graph
      .filterInNeighbors(
        course.id,
        prereqId =>
          graph.getEdgeAttribute(prereqId, course.id, "type") === RequirementType.PREREQUISITE
      )
      .map(prereqId => graph.getNodeAttribute(prereqId, "semester"))
      .every(semester => semester! < currentSemester)

    const corequisites = graph
      .filterInEdges(course.id, (_, edge) => edge.type === RequirementType.COREQUISITE)
      .map(edgeId => graph.source(edgeId))
      .map(nodeId => graph.getNodeAttributes(nodeId))

    if (
      allPrereqsCompleted &&
      corequisites.length + coursesInCurrentSemester.length + 1 <= profile.coursePerSemester
    ) {
      // if all of the prereqs were completed in previous semesters, we can add this course to the current one
      // console.log(`Adding ${course["name"]} to schedule in semester ${currentSemester}`)
      graph.setNodeAttribute(course["id"], "semester", currentSemester)
      coursesInCurrentSemester.push(course["id"])

      // add all corequisites to the schedule
      for (const corequisite of corequisites) {
        graph.setNodeAttribute(corequisite.id, "semester", currentSemester)
        coursesInCurrentSemester.push(corequisite.id)
      }
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
    program: course["program"],

    earliestFinish: course["earliestFinish"],
    latestFinish: course["latestFinish"],
    fanOut: course["fanOut"],

    dependents: graph.mapOutboundNeighbors(courseId, dependentId => dependentId),
    prerequisites: graph
      .mapInboundNeighbors(courseId, prereqId => prereqId)
      .filter(
        prereqId =>
          graph.getEdgeAttribute(prereqId, courseId, "type") === RequirementType.PREREQUISITE
      ),
    corequisites: graph
      .mapInboundNeighbors(courseId, prereqId => prereqId)
      .filter(
        prereqId =>
          graph.getEdgeAttribute(prereqId, courseId, "type") === RequirementType.COREQUISITE
      )
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
