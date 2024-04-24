import { Change, ChangeType } from "@repo/constants"
import { db, RequirementType } from "@repo/db"
import Graph from "graphology"
import { topologicalGenerations } from "graphology-dag"
import { Attributes } from "graphology-types"

import { addCourseToGraph, COURSE_PAYLOAD_QUERY, CourseGraph, CoursePayload } from "./course"
import { Program, programHandler } from "./defaultCourses"
import {
  _getAllDependents,
  getCorequisites,
  getCoursesInSemester,
  graphToHydratedStudentProfile
} from "./graph"
import { _canMoveCourse } from "./schedule"
import { computeNodeStats } from "./stats"
import { BaseStudentProfile, CourseNode, ScheduleConstraint, StudentProfile } from "./types"

const GEN_ED_PROGRAM = {
  program: "GEN" as Program,
  requiredCourses: [
    {
      id: "GEN-SGEH",
      name: "Gen Ed Core Humanities",
      conditions: []
    },
    // {
    //   id: "GEN-SGEM",
    //   name: "Gen Ed Core Mathematics",
    //   conditions: []
    // },
    // {
    //   id: "GEN-SGEN",
    //   name: "Gen Ed Core Natural Sciences",
    //   conditions: []
    // },
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
    // {
    //   id: "GEN-TGEI",
    //   name: "Gen Ed Information & Data Literacy",
    //   conditions: []
    // },
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

function scheduleConstraints(
  graph: CourseGraph,
  profile: BaseStudentProfile,
  constraints: ScheduleConstraint[]
) {
  for (const constraint of constraints) {
    if (constraint.semester > profile.timeToGraduate) {
      throw Error(
        `Invalid constraint: semester constraint (${constraint.semester}) on course ${constraint.courseID} is greater than the time to graduate (${profile.timeToGraduate})`
      )
    }
    const numNodesInSemester = getCoursesInSemester(graph, constraint.semester).length
    if (numNodesInSemester >= profile.coursePerSemester) {
      throw Error(
        `Invalid constraint (${JSON.stringify(constraint)}): there are already ${numNodesInSemester} courses in ${constraint.semester}, which exceeds the profile's coursePerSemester (${profile.coursePerSemester})`
      )
    }
    graph.setNodeAttribute(constraint.courseID, "semester", constraint.semester)

    const corequisites = getCorequisites(graph, constraint.courseID)
    for (const corequisite of corequisites) {
      graph.setNodeAttribute(corequisite.id, "semester", constraint.semester)
    }
  }
}

export function scheduleCourses(
  graph: CourseGraph,
  profile: BaseStudentProfile,
  constraints: ScheduleConstraint[] = []
) {
  const constrainedCourseIDs = constraints.map(c => c.courseID)
  scheduleConstraints(graph, profile, constraints)

  let currentSemester: number = 0
  let numCoursesInCurrentSemesterByProgram: { [program in Program | "undefined"]?: number } = {}
  let numCoursesInCurrentSemester: number = 0
  let firstDeferredCourseId: string | null = null

  const addToNumCoursesInCurrentSemesterByProgram = (program: Program | undefined) => {
    const normalizedProgram = program === undefined ? "undefined" : program

    const numCourses = numCoursesInCurrentSemesterByProgram[normalizedProgram]
    if (numCourses === undefined) {
      numCoursesInCurrentSemesterByProgram[normalizedProgram] = 0
    }
    numCoursesInCurrentSemesterByProgram[normalizedProgram]! += 1
  }

  const sortedCourses = topologicalGenerations(graph)
    .flatMap(courseGeneration =>
      courseGeneration
        // don't directly schedule corequisites -- we'll add them when we schedule their parent
        .filter(courseId => {
          const edges = graph.mapOutEdges(courseId, (_, edge) => edge.type)
          return edges.length === 0 || !edges.every(type => type === "COREQUISITE")
        })
        .map(courseId => graph.getNodeAttributes(courseId))
        .sort((courseA, courseB) => courseA.slack! ?? 0 - courseB.slack! ?? 0)
    )
    .filter(course => !constrainedCourseIDs.includes(course.id))

  sortedCourses.sort((courseA, courseB) => courseA.slack! - courseB.slack!)

  const getProgramRatios = (): { [program in Program | "undefined"]?: number } => {
    const ratios: { [program in Program | "undefined"]?: number } = {}

    for (const course of sortedCourses) {
      const normalizedProgram = course.program === undefined ? "undefined" : course.program
      if (!(normalizedProgram in ratios)) {
        ratios[normalizedProgram] = 0
      }
      ratios[normalizedProgram]! += 1
    }

    for (const [program, numCourses] of Object.entries(ratios)) {
      ratios[program as Program] = numCourses / sortedCourses.length
    }
    return ratios
  }

  const programRatios = getProgramRatios()

  const tooManyProgramCourses = (program: Program | undefined): boolean => {
    const normProgram = program === undefined ? "undefined" : program

    const numCourses = numCoursesInCurrentSemesterByProgram[normProgram]
    if (numCourses === undefined) return false
    const onlyOneProgramLeft = sortedCourses.every(course => {
      if (normProgram === "undefined") {
        return course.program === undefined
      } else {
        return course.program === program
      }
    })

    if (onlyOneProgramLeft) return false

    const threshold = program === undefined ? programRatios["undefined"]! : programRatios[program]!

    return numCourses >= Math.ceil(profile.coursePerSemester * threshold)
  }

  while (sortedCourses.length > 0) {
    const course = sortedCourses.shift()!

    // check if the semester is full already and increment if it is
    if (
      numCoursesInCurrentSemester >= profile.coursePerSemester ||
      course["id"] === firstDeferredCourseId
    ) {
      // console.log(`Semester ${currentSemester} complete`)
      currentSemester += 1
      numCoursesInCurrentSemester = 0
      numCoursesInCurrentSemesterByProgram = {}
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

    const corequisites = getCorequisites(graph, course.id)

    if (
      allPrereqsCompleted &&
      !tooManyProgramCourses(course.program) &&
      corequisites.length + numCoursesInCurrentSemester + 1 <= profile.coursePerSemester
    ) {
      // if all of the prereqs were completed in previous semesters and there aren't too many courses from one program, we can add this course to the current one
      // console.log(`Adding ${course["name"]} to schedule in semester ${currentSemester}`)
      graph.setNodeAttribute(course["id"], "semester", currentSemester)
      numCoursesInCurrentSemester += 1
      addToNumCoursesInCurrentSemesterByProgram(course.program)

      // add all corequisites to the schedule
      for (const corequisite of corequisites) {
        graph.setNodeAttribute(corequisite.id, "semester", currentSemester)
        addToNumCoursesInCurrentSemesterByProgram(corequisite.program)
        numCoursesInCurrentSemester += 1
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
export function pushCourseAndDependents(
  graph: CourseGraph,
  profile: BaseStudentProfile,
  courseId: string,
  numIterations: number = 0
) {
  try {
    if (numIterations > 10) {
      throw Error("too many iterations")
    }
    const changes: Change[] = []
    // Step 1: Identify the Course and Its Dependents

    // Step 2: Next semester
    let fromSemester = graph.getNodeAttribute(courseId, "semester")
    if (fromSemester === undefined) {
      throw new Error(`Could not move ${courseId} because it has no semester`)
    }
    console.log("fromSemester", fromSemester)
    let nextSemester = fromSemester + 1

    let mv = _canMoveCourse(courseId, nextSemester, profile, graph)

    // if the course can be moved, just push it one semester
    if (mv.canMove) {
      graph.setNodeAttribute(courseId, "semester", nextSemester)
      changes.push({ type: ChangeType.Move, courseId, semester: nextSemester })

      return {
        graph,
        changes
      }
    }

    // if there are courses that depend on it, we need to find the earliest semester that they can all be pushed to

    // Step 3: Update the Course and Dependents

    while (!mv.canMove) {
      // if there is a dependent issue, push them
      if (mv.reason.type === "dependent" || mv.reason.type === "prerequisite") {
        mv.reason.courseId.forEach(depOrPreID => {
          const { graph: newGraph, changes: newChanges } = pushCourseAndDependents(
            graph,
            profile,
            depOrPreID
          )
          graph = newGraph
          changes.push(...newChanges)
          console.log(
            "after moving",
            graph.getNodeAttribute(depOrPreID, "name"),
            "to",
            graph.getNodeAttribute(depOrPreID, "semester")
          )
        })
        mv = _canMoveCourse(courseId, nextSemester, profile, graph)
        continue
      } else if (mv.reason.type === "full") {
        computeNodeStats(graph, profile)
        const nodeAttrs = [...graph.nodeEntries()].map(nodeEntry => nodeEntry.attributes)

        const nextSemesterNodeAttrs = nodeAttrs.filter(node => node.semester === nextSemester)

        const courseWithMostSlack = nextSemesterNodeAttrs.reduce(
          (maxNode, currNode) => (maxNode.slack! >= currNode.slack! ? maxNode : currNode),
          nextSemesterNodeAttrs[0]
        )

        const { graph: newGraph, changes: newChanges } = pushCourseAndDependents(
          graph,
          profile,
          courseWithMostSlack.id,
          numIterations + 1
        )
        graph = newGraph
        changes.push(...newChanges)
        mv = _canMoveCourse(courseId, nextSemester, profile, graph)
        continue
      }

      throw new Error(
        `Could not move ${graph.getNodeAttribute(courseId, "name")} because of ${JSON.stringify(mv.reason)}`
      )
    }

    // now we can move:
    if (mv.canMove) {
      graph.setNodeAttribute(courseId, "semester", nextSemester)
      changes.push({ type: ChangeType.Move, courseId, semester: nextSemester })
    }

    console.log("CHANGES", changes)

    return {
      graph,
      changes
    }
  } catch (error) {
    console.log("ERROR IN pushCourseAndDependents", JSON.stringify(error))
    throw error
  }
}
