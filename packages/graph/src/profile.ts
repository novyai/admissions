import { Change, ChangeType } from "@repo/constants"
import { db, RequirementType } from "@repo/db"
import Graph from "graphology"
import { topologicalGenerations } from "graphology-dag"
import { Attributes } from "graphology-types"

import {
  addCourseToGraph,
  COURSE_PAYLOAD_QUERY,
  CourseAttributes,
  CourseGraph,
  CoursePayload
} from "./course"
import { Program, programHandler } from "./defaultCourses"
import {
  _getAllDependents,
  getChangesBetweenGraphs,
  getCorequisites,
  getCoursesInSemester,
  graphToHydratedStudentProfile
} from "./graph"
import { _canMoveCourse } from "./schedule"
import { computeNodeStats } from "./stats"
import {
  BaseStudentProfile,
  CourseNode,
  NegativeScheduleConstraint,
  PositiveScheduleConstraint,
  ScheduleConstraints,
  StudentProfile
} from "./types"

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
  scheduleCourses(graph, profile)
  return graphToHydratedStudentProfile(graph, profile)
}

function schedulePositiveConstraints(
  graph: CourseGraph,
  profile: BaseStudentProfile,
  constraints: PositiveScheduleConstraint[]
) {
  for (const constraint of constraints) {
    const numNodesInSemester = getCoursesInSemester(graph, constraint.semester).length
    if (numNodesInSemester + constraint.courseIDs.length > profile.coursePerSemester) {
      throw Error(
        `Invalid positive constraint (${JSON.stringify(constraint)}): there are already ${numNodesInSemester} courses in semester ${constraint.semester}, which exceeds the profile's coursePerSemester (${profile.coursePerSemester})`
      )
    }

    for (const courseID of constraint.courseIDs) {
      graph.setNodeAttribute(courseID, "semester", constraint.semester)
      const corequisites = getCorequisites(graph, courseID)
      for (const corequisite of corequisites) {
        graph.setNodeAttribute(corequisite.id, "semester", constraint.semester)
      }
    }
  }
}

export function scheduleCourses(
  graph: CourseGraph,
  profile: BaseStudentProfile,
  constraints: ScheduleConstraints = { positive: [], negative: [] },
  distributeCoursesEvenly: boolean = true
) {
  computeNodeStats(graph, profile)
  const positiveConstrainedCourseIDs = constraints.positive.flatMap(c => c.courseIDs)
  schedulePositiveConstraints(graph, profile, constraints.positive)
  const fixedSemesters = constraints.positive.filter(c => !c.canAddCourses).map(c => c.semester)

  let currentSemester: number = 0
  while (fixedSemesters.includes(currentSemester)) {
    currentSemester += 1
  }

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

  const initializeNumCoursesInCurrentSemesterByProgram = (semester: number) => {
    numCoursesInCurrentSemesterByProgram = {}
    const coursesInSemester = getCoursesInSemester(graph, semester)
    for (const course of coursesInSemester) {
      addToNumCoursesInCurrentSemesterByProgram(course.program)
    }
  }

  const isCourseNegativelyConstrained = (courseID: string, semester: number) =>
    constraints.negative.some(
      constraint => constraint.courseID == courseID && constraint.semester === semester
    )

  const allCourses = [...graph.nodeEntries()].map(entry => entry.attributes)
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
    .filter(course => !positiveConstrainedCourseIDs.includes(course.id))

  sortedCourses.sort((courseA, courseB) => courseA.slack! - courseB.slack!)
  const getProgramRatios = (): { [program in Program | "undefined"]?: number } => {
    const ratios: { [program in Program | "undefined"]?: number } = {}

    for (const course of allCourses) {
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

  const tooManyProgramCourses = (
    program: Program | undefined,
    distributeProgramCoursesEvenly: boolean
  ): boolean => {
    if (!distributeProgramCoursesEvenly) return false

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

  const scheduleCourse = (
    course: CourseAttributes,
    distributeProgramCoursesEvenly: boolean,
    limitToTimeTogGraduate: boolean
  ) => {
    // check if the semester is full already and increment if it is
    if (
      numCoursesInCurrentSemester >= profile.coursePerSemester ||
      course["id"] === firstDeferredCourseId
    ) {
      // console.log(`Semester ${currentSemester} complete`)
      currentSemester += 1
      while (fixedSemesters.includes(currentSemester)) {
        currentSemester += 1
      }
      numCoursesInCurrentSemester = getCoursesInSemester(graph, currentSemester).length
      initializeNumCoursesInCurrentSemesterByProgram(currentSemester)
      firstDeferredCourseId = null
    }

    if (currentSemester >= profile.timeToGraduate && limitToTimeTogGraduate) {
      sortedCourses.unshift(course)
      return
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
      !isCourseNegativelyConstrained(course.id, currentSemester) &&
      allPrereqsCompleted &&
      !tooManyProgramCourses(course.program, distributeProgramCoursesEvenly) &&
      corequisites.length + numCoursesInCurrentSemester + 1 <= profile.coursePerSemester
    ) {
      // if all of the prereqs were completed in previous semesters and there aren't too many courses from one program, we can add this course to the current one
      // console.log(`Adding ${course["name"]} to schedule in semester ${currentSemester}`)
      graph.setNodeAttribute(course.id, "semester", currentSemester)
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

  while (sortedCourses.length > 0 && currentSemester < profile.timeToGraduate) {
    const course = sortedCourses.shift()!
    scheduleCourse(course, distributeCoursesEvenly, true)
  }

  // Go back and see if we can add remaining courses to older semesters
  currentSemester = 0
  while (fixedSemesters.includes(currentSemester)) {
    currentSemester += 1
  }
  numCoursesInCurrentSemester = getCoursesInSemester(graph, currentSemester).length
  initializeNumCoursesInCurrentSemesterByProgram(currentSemester)
  firstDeferredCourseId = null
  sortedCourses.sort((courseA, courseB) => courseA.slack! - courseB.slack!)
  while (sortedCourses.length > 0) {
    const course = sortedCourses.shift()!
    scheduleCourse(course, false, false)
  }
  return graph
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
  courseId: string
): { graph: CourseGraph; changes: Change[] } {
  try {
    const fromSemester = graph.getNodeAttribute(courseId, "semester")
    if (fromSemester === undefined) {
      throw new Error(`Could not move ${courseId} because it has no semester`)
    }

    const canMove = _canMoveCourse(courseId, fromSemester + 1, profile, graph)
    if (canMove) {
      graph.setNodeAttribute(courseId, "semester", fromSemester + 1)
      return {
        graph: graph,
        changes: [{ type: ChangeType.Move, courseId: courseId, semester: fromSemester + 1 }]
      }
    }

    const oldGraph = graph.copy()

    const prevSemesters = [...Array(fromSemester + 1).keys()]
    const positiveConstraints: PositiveScheduleConstraint[] = prevSemesters.flatMap(semester => {
      const coursesInSemester = getCoursesInSemester(graph, semester)
        .map(course => course.id)
        .filter(id => id !== courseId)
      return {
        semester: semester,
        canAddCourses: false,
        courseIDs: coursesInSemester
      }
    })
    const negativeConstraints: NegativeScheduleConstraint[] = [
      {
        courseID: courseId,
        semester: fromSemester
      }
    ]

    for (const nodeEntry of graph.nodeEntries()) {
      nodeEntry.attributes.semester = undefined
    }

    const newGraph = scheduleCourses(graph, profile, {
      positive: positiveConstraints,
      negative: negativeConstraints
    })

    const changes = getChangesBetweenGraphs(oldGraph, newGraph)

    return {
      graph,
      changes
    }
  } catch (error) {
    console.log("ERROR IN pushCourseAndDependents", JSON.stringify(error))
    throw error
  }
}
