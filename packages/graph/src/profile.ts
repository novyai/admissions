import { Change, ChangeType } from "@repo/constants"
import { db, RequirementType } from "@repo/db"
import { getTrack } from "@repo/db/queries/track"
import Graph from "graphology"
import { topologicalGenerations } from "graphology-dag"

import {
  addCourseToGraph,
  COURSE_PAYLOAD_QUERY,
  CourseAttributes,
  CourseGraph,
  CoursePayload
} from "./course"
import {
  _getAllDependents,
  getChangesBetweenGraphs,
  getCorequisites,
  getCoursesInSemester,
  graphToHydratedStudentProfile
} from "./graph"
import { _canMoveCourse, canMoveCourse } from "./schedule"
import { computeNodeStats } from "./stats"
import {
  BaseStudentProfile,
  CourseNode,
  HydratedStudentProfile,
  NegativeScheduleConstraint,
  PositiveScheduleConstraint,
  ScheduleConstraints,
  StudentProfile
} from "./types"

export async function createGraph(profile: StudentProfile): Promise<CourseGraph> {
  const graph: CourseGraph = new Graph()
  const trackIds = [...profile.tracks, "GEN"]
  const tracks = await Promise.all(trackIds.map(async t => getTrack(t)))

  // DIFFERENT TYPE OF TRACKS:

  // IF ALL COURSES ARE REQUIRED PICK ALL (courses.length = number of credits)
  // TODO: IF N COURSES ARE REQUIRED PICK SOME N (right now I am just saying all)

  const requiredCoursesSet = new Set<string>()
  const coursesToHydrateSet = new Set<string>()
  // WE SHOULD PROBABLY START COLORING BY REQUIREMENT
  const courseToTrack = new Map<string, Set<string>>()

  function addToCoursesTrackMap(courseId: string, trackId: string) {
    if (!courseToTrack.has(courseId)) {
      courseToTrack.set(courseId, new Set<string>())
    }
    courseToTrack.get(courseId)!.add(trackId)
  }

  for (const track of tracks) {
    if (track === null) {
      continue
    }
    for (const requirement of track.requirements) {
      for (const c of requirement.courses) {
        // CONDITIONAL LOGIC FOR WHICH COURSES NEEDS TO BE IN HERE
        requiredCoursesSet.add(c.id)
        addToCoursesTrackMap(c.id, track.id)
        for (const req of c.courseRequisites) {
          coursesToHydrateSet.add(req.requisitesId)
          addToCoursesTrackMap(req.requisitesId, track.id)
        }
      }
    }
  }

  for (const courseId of profile.requiredCourses) {
    requiredCoursesSet.add(courseId)
  }

  const courseMap = new Map<string, CoursePayload>()

  const hydratedCourses = await db.course.findMany({
    where: {
      id: { in: [...requiredCoursesSet, ...coursesToHydrateSet] }
    },
    ...COURSE_PAYLOAD_QUERY
  })

  for (const course of hydratedCourses) {
    courseMap.set(course.id, {
      ...course,
      tracks: [...(courseToTrack.get(course.id) ?? new Set<string>())]
    })
  }

  for (const courseId of courseMap.keys()) {
    addCourseToGraph({
      courseId: courseId,
      graph: graph,
      courseMap: courseMap,
      requiredCourses: [...requiredCoursesSet]
    })
  }

  for (const [i, sem] of profile.semesters.entries()) {
    for (const courseId of sem) {
      graph.setNodeAttribute(courseId, "semester", i)
    }
  }

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
  console.log(
    "test",
    graph.mapNodes((c, attr) => ({
      c,
      attr
    }))
  )
  const positiveConstrainedCourseIDs = constraints.positive.flatMap(c => c.courseIDs)
  schedulePositiveConstraints(graph, profile, constraints.positive)
  const fixedSemesters = constraints.positive.filter(c => !c.canAddCourses).map(c => c.semester)

  let currentSemester: number = 0
  while (fixedSemesters.includes(currentSemester)) {
    currentSemester += 1
  }

  let numCoursesInCurrentSemesterByTrack: { [track in string | "undefined"]?: number } = {}
  let numCoursesInCurrentSemester: number = 0
  let firstDeferredCourseId: string | null = null

  const addCourseToSemester = (course: CourseAttributes) => {
    graph.setNodeAttribute(course["id"], "semester", currentSemester)
    numCoursesInCurrentSemester += 1

    if (!course.tracks) {
      return
    }
    course.tracks.forEach(p => {
      const normalizedProgram = p === undefined ? "undefined" : p

      const numCourses = numCoursesInCurrentSemesterByTrack[normalizedProgram]
      if (numCourses === undefined) {
        numCoursesInCurrentSemesterByTrack[normalizedProgram] = 0
      }
      numCoursesInCurrentSemesterByTrack[normalizedProgram]! += 1
    })
  }

  const initializeNumCoursesInCurrentSemesterByProgram = (semester: number) => {
    numCoursesInCurrentSemesterByTrack = {}
    const coursesInSemester = getCoursesInSemester(graph, semester)
    for (const course of coursesInSemester) {
      addCourseToSemester(course)
    }
  }

  const isCourseNegativelyConstrained = (courseID: string, semester: number) =>
    constraints.negative.some(
      constraint => constraint.courseID == courseID && constraint.semester === semester
    )

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

  const getProgramRatios = (): { [track in string | "undefined"]: number } => {
    const ratios: { [track in string | "undefined"]?: number } = {
      undefined: 0
    }

    for (const course of sortedCourses) {
      const tracks = course.tracks === undefined ? "undefined" : course.tracks
      if (tracks === "undefined" || tracks.length === 0) {
        ratios["undefined"]! += 1
      } else {
        for (const program of tracks) {
          if (!(program in ratios)) {
            ratios[program] = 0
          }
          ratios[program]! += 1
        }
      }
    }

    for (const [track, numCourses] of Object.entries(ratios)) {
      ratios[track] = (numCourses ?? 0) / sortedCourses.length
    }

    return ratios as { [track in string | "undefined"]: number }
  }

  const programRatios = getProgramRatios()

  const tooManyTrackCourses = (
    track: string | undefined,
    distributeTrackCoursesEvenly: boolean
  ) => {
    if (!distributeTrackCoursesEvenly) return false
    const normProgram = track === undefined ? "undefined" : track

    const numCourses = numCoursesInCurrentSemesterByTrack[normProgram]
    if (numCourses === undefined) return false
    const onlyOneProgramLeft = sortedCourses.every(course => {
      if (!course.tracks || !track) {
        return false
      }
      if (normProgram === "undefined") {
        return course.tracks === undefined
      } else {
        return course.tracks.includes(track)
      }
    })

    if (onlyOneProgramLeft) return false

    const threshold = track === undefined ? programRatios["undefined"]! : programRatios[track]!

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

    const tooManyCourses =
      course.tracks ?
        !course.tracks.some(program => tooManyTrackCourses(program, distributeProgramCoursesEvenly))
      : false
    if (
      !isCourseNegativelyConstrained(course.id, currentSemester) &&
      allPrereqsCompleted &&
      tooManyCourses &&
      corequisites.length + numCoursesInCurrentSemester + 1 <= profile.coursePerSemester
    ) {
      // if all of the prereqs were completed in previous semesters and there aren't too many courses from one program, we can add this course to the current one
      // console.log(`Adding ${course["name"]} to schedule in semester ${currentSemester}`)
      addCourseToSemester(course)

      // add all corequisites to the schedule
      for (const corequisite of corequisites) {
        addCourseToSemester(corequisite)
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
  graph: CourseGraph,
  courseId: string,
  course: CourseAttributes | undefined
): CourseNode {
  if (!course) {
    course = graph.getNodeAttributes(courseId)
  }
  return {
    id: courseId,
    name: course.name,
    tracks: course.tracks,
    earliestFinish: course.earliestFinish,
    latestFinish: course.latestFinish,
    fanOut: course.fanOut,

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
  profile: HydratedStudentProfile,
  courseId: string
): { graph: CourseGraph; changes: Change[] } {
  try {
    const fromSemester = graph.getNodeAttribute(courseId, "semester")
    if (fromSemester === undefined) {
      throw new Error(`Could not move ${courseId} because it has no semester`)
    }

    const canMove = canMoveCourse(courseId, fromSemester + 1, profile)
    if (canMove.canMove) {
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
