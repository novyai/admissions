import {
  getCorequisites,
  getCoursesInSemester,
  graphToHydratedStudentProfile,
  studentProfileToGraph
} from "@graph/graph"
import {
  BaseStudentProfile,
  HydratedStudentProfile,
  PositiveScheduleConstraint,
  ScheduleConstraints
} from "@graph/types"
import { RequirementType } from "@repo/db"
import { topologicalGenerations } from "graphology-dag"

import { CourseAttributes, CourseGraph } from "./course"
import { computeNodeStats } from "./stats"

export type CannotMoveReason = {
  reason:
    | {
        type: "prerequisite" | "dependent"
        corequisite: boolean
        courseId: string[]
        courseName: string[]
      }
    | { type: "graduation" }
    | {
        type: "full"
        semesterIndex: number
      }
    | { type: "not-found-in-schedule" }
    | { type: "semester-already-taken"; semesterIndex: number }

  canMove: false
}

type CanMoveReturn = CannotMoveReason | { canMove: true }

/**
 * Checks if a course can be moved to a different semester without violating prerequisites and graduation time.
 * @param courseId The ID of the course to move.
 * @param toSemester The target semester index to move the course to.
 * @param profile The student's profile with a vaild schedule.
 * @returns {boolean} True if the course can be moved, false otherwise.
 */
export function canMoveCourse(
  courseId: string,
  toSemester: number,
  profile: HydratedStudentProfile,
  ignoreGraduation: boolean = true
): CannotMoveReason | { canMove: true } {
  const graph = studentProfileToGraph(profile)
  return _canMoveCourse(courseId, toSemester, profile, graph, ignoreGraduation)
}

/**
 * Checks for prerequisites not completed before the target semester.
 * @param courseId The ID of the course to move.
 * @param toSemester The target semester.
 * @param graph The course graph.
 * @returns An array of prerequisite course IDs not completed before the target semester.
 */
function checkDependents(courseId: string, toSemester: number, graph: CourseGraph): string[] {
  return graph
    .mapInNeighbors(courseId, (_prereqId, prereq) => prereq)
    .filter(
      prereq =>
        graph.getEdgeAttribute(prereq.id, courseId, "type") === RequirementType.PREREQUISITE &&
        prereq.semester &&
        prereq.semester >= toSemester
    )
    .map(prereq => prereq.id)
}

/**
 * Checks for dependent courses not completed after the given semester.
 * @param courseId The ID of the course to move.
 * @param toSemester The target semester.
 * @param graph The course graph.
 * @returns An array of dependent course IDs not completed after the target semester.
 */
function checPrereqs(courseId: string, toSemester: number, graph: CourseGraph): string[] {
  return graph
    .mapOutNeighbors(courseId, (_dependentId, dependent) => dependent)
    .filter(
      dependent =>
        graph.getEdgeAttribute(courseId, dependent.id, "type") === RequirementType.PREREQUISITE &&
        dependent.semester &&
        dependent.semester <= toSemester
    )
    .map(dependent => dependent.id)
}

/**
 * Checks if a course is a corequisite of another course and if so, checks if the main course can be moved to the target semester.
 * @param courseId The ID of the course to move.
 * @param toSemester The target semester.
 * @param graph
 * @returns
 */
function checkCorequisiteRequirements(
  courseId: string,
  toSemester: number,
  graph: CourseGraph,
  profile: BaseStudentProfile
): CanMoveReturn {
  // if its a corequistite of another course check those courses prereqs

  // get the main course
  const mainCourse = graph
    .mapInNeighbors(courseId, (_coreqId, coreq) => coreq)
    .find(
      coreq => graph.getEdgeAttribute(coreq.id, courseId, "type") === RequirementType.COREQUISITE
    )

  if (!mainCourse)
    return {
      canMove: true
    }

  // check if we could move the main course to the target semester
  const canMoveMainCourse = _canMoveCourse(mainCourse.id, toSemester, profile, graph)
  if (!canMoveMainCourse.canMove) {
    return {
      canMove: false,
      reason:
        (
          canMoveMainCourse.reason.type === "semester-already-taken" ||
          canMoveMainCourse.reason.type === "not-found-in-schedule" ||
          canMoveMainCourse.reason.type === "full" ||
          canMoveMainCourse.reason.type === "graduation"
        ) ?
          canMoveMainCourse.reason
        : {
            ...canMoveMainCourse.reason,
            corequisite: true
          }
    }
  } else {
    return canMoveMainCourse
  }
}

export function moveCourse(courseId: string, toSemester: number, profile: HydratedStudentProfile) {
  const graph: CourseGraph = studentProfileToGraph(profile)
  const canMove = _canMoveCourse(courseId, toSemester, profile, graph)
  if (canMove) {
    graph.setNodeAttribute(courseId, "semester", toSemester)
    return graphToHydratedStudentProfile(graph, profile)
  }
  return profile
}

export function _canMoveCourse(
  courseId: string,
  toSemester: number,
  profile: BaseStudentProfile,
  graph: CourseGraph,
  ignoreGraduation: boolean = true
): CanMoveReturn {
  if (toSemester < profile.currentSemester) {
    return {
      canMove: false,
      reason: { type: "semester-already-taken", semesterIndex: toSemester }
    }
  }

  if (!ignoreGraduation && toSemester >= profile.timeToGraduate) {
    return {
      canMove: false,
      reason: { type: "graduation" }
    }
  }

  const fromSemester = graph.getNodeAttribute(courseId, "semester")

  // Ensure the course exists in the fromSemester
  if (fromSemester === undefined) {
    return { canMove: false, reason: { type: "not-found-in-schedule" } }
  }

  const nodes = [...graph.nodeEntries()]

  const toSemesterNumCourses = nodes.filter(
    nodeEntry => nodeEntry.attributes.semester === toSemester
  ).length

  console.log("toSemester", toSemester)
  console.log("toSemesterNumCourses", toSemesterNumCourses)

  const req = checkCorequisiteRequirements(courseId, toSemester, graph, profile)
  if (!req.canMove) {
    return req
  }

  // Find all courses that list the moving course as a prerequisite
  const failedPre = checPrereqs(courseId, toSemester, graph)
  if (failedPre.length > 0)
    return {
      canMove: false,
      reason: {
        corequisite: false,
        type: "prerequisite",
        courseId: failedPre,
        courseName: failedPre.map(courseID => graph.getNodeAttribute(courseID, "name"))
      }
    }

  const failedDep = checkDependents(courseId, toSemester, graph)
  if (failedDep.length > 0)
    return {
      canMove: false,
      reason: {
        corequisite: false,
        type: "dependent",
        courseId: failedDep,
        courseName: failedDep.map(courseID => graph.getNodeAttribute(courseID, "name"))
      }
    }

  if (
    toSemesterNumCourses >= profile.coursePerSemester
    // toSemester in profile.semesters &&
    // profile.semesters[toSemester - 1] &&
    // profile.semesters[toSemester]!.length >= profile.coursePerSemester
  ) {
    return {
      canMove: false,
      reason: {
        type: "full",
        semesterIndex: toSemester
      }
    }
  }
  return { canMove: true }
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
  // fixed semesters are semesters we shouldn't add any more courses to
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
