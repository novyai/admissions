import { Change, ChangeType } from "@repo/constants"
import { db, RequirementType } from "@repo/db"
import { getTrack } from "@repo/db/queries/track"
import Graph from "graphology"

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
  getCoursesInSemester,
  graphToHydratedStudentProfile
} from "./graph"
import { _canMoveCourse, scheduleCourses } from "./schedule"
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
import { isSubsetOf as isSubset } from "./utils"

export function doesProfileContainCourse(
  profile: HydratedStudentProfile,
  courseId: string
): boolean {
  return profile.semesters.some(semester => semester.some(course => course.id === courseId))
}

export function getCourseSemester(
  profile: HydratedStudentProfile,
  courseId: string
): number | undefined {
  const semesterIndex = profile.semesters.findIndex(semester =>
    semester.some(course => course.id === courseId)
  )
  return semesterIndex === -1 ? undefined : semesterIndex
}

function getCoursesToRemove(
  graph: CourseGraph,
  courses: Array<{ id: string; creditHours: number; requirements: Array<{ id: string }> }>,
  requiredCoursesSet: Set<string>,
  reqToCourses: Map<
    string,
    Array<{ courseId: string; creditHours: number; requirements: string[] }>
  >,
  reqToCreditHours: Map<string, { actual: number; needed: number }>
) {
  interface Course {
    dependents: Set<string>
    courseId: string
    creditHours: number
    requirements: string[]
  }
  const requiredCoursesRemoveCandidates: Array<{
    courseId: string
    creditHours: number
    requirements: string[]
  }> = []
  const requiredCoursesRemoveCandidatesSet = new Set<string>()
  for (const [reqId, courses] of reqToCourses.entries()) {
    for (const course of courses) {
      if (requiredCoursesRemoveCandidatesSet.has(course.courseId)) {
        continue
      }
      const { needed, actual } = reqToCreditHours.get(reqId)!
      if (course.creditHours !== 0 && actual - course.creditHours >= needed) {
        requiredCoursesRemoveCandidates.push(course)
        requiredCoursesRemoveCandidatesSet.add(course.courseId)
      }
    }
  }

  // remove unnecessary courses (non-required prereqs whose dependents are already fully covered by another course)
  const nonRequirementPrereqs = courses
    .filter(
      course =>
        !requiredCoursesSet.has(course.id) && !requiredCoursesRemoveCandidatesSet.has(course.id)
    )
    .map(c => ({
      courseId: c.id,
      creditHours: c.creditHours,
      requirements: []
    }))

  const removeCourseCandidates = [...nonRequirementPrereqs, ...requiredCoursesRemoveCandidates].map(
    course => ({
      ...course,
      dependents: new Set(_getAllDependents(course.courseId, graph))
    })
  )

  removeCourseCandidates.sort(
    ({ dependents: depsA }, { dependents: depsB }) => depsB.size - depsA.size
  )

  const canRemoveCourse = (course: Course) => {
    for (const reqId of course.requirements) {
      const { needed, actual } = reqToCreditHours.get(reqId)!
      if (actual - course.creditHours < needed) {
        return false
      }
    }
    return true
  }

  const coursesToRemove = new Set<string>()
  while (removeCourseCandidates.length > 0) {
    const course = removeCourseCandidates.pop()!

    if (!canRemoveCourse(course)) {
      continue
    }
    for (const otherCourse of removeCourseCandidates) {
      if (coursesToRemove.has(course.courseId)) {
        break
      }
      if (isSubset(course.dependents, otherCourse.dependents)) {
        coursesToRemove.add(course.courseId)
        for (const reqId of course.requirements) {
          const { needed, actual } = reqToCreditHours.get(reqId)!
          reqToCreditHours.set(reqId, { needed: needed, actual: actual - course.creditHours })
        }
      }
    }
  }
  return coursesToRemove
}

export async function createGraph(
  profile: StudentProfile
): Promise<{ graph: CourseGraph; courseToReqList: Map<string, string[]> }> {
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

  const reqToCreditHours = new Map<string, { needed: number; actual: number }>()

  function addToCoursesTrackMap(courseId: string, trackId: string) {
    if (!courseToTrack.has(courseId)) {
      courseToTrack.set(courseId, new Set<string>())
    }
    courseToTrack.get(courseId)!.add(trackId)
  }

  function createCourseToReqMaps() {
    const courseToNumReqs = new Map<string, number>()
    const courseToReqList = new Map<string, string[]>()
    for (const track of tracks) {
      if (track === null) continue
      for (const requirement of track.requirements) {
        for (const course of requirement.courses) {
          if (!requirement.nonOverlapping) {
            if (!courseToNumReqs.has(course.id)) {
              courseToNumReqs.set(course.id, 0)
            }
            const numReqs = courseToNumReqs.get(course.id)!
            courseToNumReqs.set(course.id, numReqs + 1)
          }
          if (!courseToReqList.has(course.id)) {
            courseToReqList.set(course.id, [])
          }
          courseToReqList.get(course.id)!.push(requirement.id)
        }
      }
    }
    return { courseToNumReqs, courseToReqList }
  }

  // course IDs to the num reqs they fulfill (excluding nonOverlapping reqs)
  const { courseToNumReqs, courseToReqList } = createCourseToReqMaps()

  for (const track of tracks) {
    if (track === null) {
      continue
    }
    // fill out nonOverlapping reqs first so we don't run out of courses for that req
    const sortedReqs = [...track.requirements]
    sortedReqs.sort((reqA, reqB) => {
      if (reqA.nonOverlapping === reqB.nonOverlapping) return 0
      return reqA.nonOverlapping ? -1 : 1
    })
    for (const requirement of sortedReqs) {
      reqToCreditHours.set(requirement.id, { needed: requirement.creditHoursNeeded, actual: 0 })
      const requirementCourses = []
      let totalCreditHours = 0
      const validCourseOptions =
        requirement.nonOverlapping ?
          requirement.courses.filter(c => !requiredCoursesSet.has(c.id))
        : requirement.courses

      validCourseOptions.sort((courseA, courseB) => {
        const numReqsA = courseToNumReqs.get(courseA.id)!
        const numReqsB = courseToNumReqs.get(courseB.id)!

        /* 
        if the requirement is nonOverlapping, we actually want to pick the courses that fulfill the least amount of other requirements first so we don't steal double-counting opportunity
        */
        return requirement.nonOverlapping ? numReqsB - numReqsA : numReqsA - numReqsB
      })

      const validCourseOptionsInitialLength = validCourseOptions.length

      while (totalCreditHours < requirement.creditHoursNeeded) {
        const course = validCourseOptions.pop()
        if (course === undefined) {
          console.log(
            `requirement.courses (length ${requirement.courses.length})`,
            requirement.courses.map(c => ({
              name: c.name,
              creditHours: c.creditHours
            }))
          )
          console.log("validCourseOptions", validCourseOptionsInitialLength)
          throw Error(
            `validCourseOptions was not enough to fulfill requirement ${requirement.id} needing ${requirement.creditHoursNeeded} credit hours`
          )
        }
        requirementCourses.push(course)
        totalCreditHours += course.creditHours
      }

      for (const c of requirementCourses) {
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

  const reqToCourses = new Map<
    string,
    Array<{ courseId: string; creditHours: number; requirements: string[] }>
  >()

  for (const course of hydratedCourses) {
    courseMap.set(course.id, {
      ...course,
      tracks: [...(courseToTrack.get(course.id) ?? new Set<string>())]
    })

    for (const req of course.requirements) {
      const { needed, actual } = reqToCreditHours.get(req.id)!
      reqToCreditHours.set(req.id, { needed: needed, actual: actual + course.creditHours })
      if (!reqToCourses.has(req.id)) {
        reqToCourses.set(req.id, [])
      }
      reqToCourses.get(req.id)?.push({
        courseId: course.id,
        creditHours: course.creditHours,
        requirements: course.requirements.map(({ id }) => id)
      })
    }
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

  const coursesToRemove = getCoursesToRemove(
    graph,
    hydratedCourses,
    requiredCoursesSet,
    reqToCourses,
    reqToCreditHours
  )

  for (const courseId of coursesToRemove) {
    graph.dropNode(courseId)
    courseToReqList.delete(courseId)
  }

  return { graph, courseToReqList }
}

/**
 * Load all courses into a student's profile and build their schedule
 * @param profile the basic information about the student's profile
 */
export const getStudentProfileFromRequirements = async (
  profile: BaseStudentProfile,
  constraints?: ScheduleConstraints
) => {
  const { graph, courseToReqList } = await createGraph({ ...profile, semesters: [] })
  scheduleCourses(graph, profile, constraints)
  return graphToHydratedStudentProfile(graph, courseToReqList, profile)
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

export function rescheduleCourse(
  graph: CourseGraph,
  profile: HydratedStudentProfile,
  courseId: string
): { graph: CourseGraph; changes: Change[]; profile: HydratedStudentProfile } {
  const oldGraph = graph.copy()

  const fromSemester = graph.getNodeAttribute(courseId, "semester")
  const currentTimeToGraduate = [...graph.nodeEntries()].reduce(
    (maxSemester, nodeEntry) => Math.max(maxSemester, nodeEntry.attributes.semester! + 1),
    1
  )
  if (fromSemester === undefined) {
    throw new Error(`Could not move ${courseId} because it has no semester`)
  }
  const { graph: pushedGraph, changes: pushedChanges } = pushCourseAndDependents(
    graph,
    profile,
    courseId
  )
  const latestChangeSemester = pushedChanges.reduce(
    (maxSemester, change) => Math.max(maxSemester, change.semester),
    0
  )

  // if pushing course and dependents didn't affect grad time, just return
  if (latestChangeSemester < currentTimeToGraduate) {
    return {
      graph: pushedGraph,
      changes: pushedChanges,
      profile: graphToHydratedStudentProfile(graph, profile.courseToReqList, profile)
    }
  }

  const prevSemesters = [...Array(fromSemester).keys()]
  const positiveConstraints: PositiveScheduleConstraint[] = prevSemesters.flatMap(semester => {
    const coursesInSemester = getCoursesInSemester(graph, semester).map(course => course.id)
    return {
      semester: semester,
      canAddCourses: false,
      courseIDs: coursesInSemester
    }
  })
  if (fromSemester === profile.currentSemester) {
    const coursesInSemester = getCoursesInSemester(graph, fromSemester)
      .map(course => course.id)
      .filter(id => id !== courseId) // don't freeze the course we're pushing
    positiveConstraints.push({
      semester: fromSemester,
      canAddCourses: false,
      courseIDs: coursesInSemester
    })
  }

  console.log("POSITIVE CONSTRAINTS", positiveConstraints)

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
    profile: graphToHydratedStudentProfile(graph, profile.courseToReqList, profile),
    changes
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
    const changes: Change[] = []

    let fromSemester = graph.getNodeAttribute(courseId, "semester")
    if (fromSemester === undefined) {
      throw new Error(`Could not move ${courseId} because it has no semester`)
    }
    let nextSemester = fromSemester + 1

    let mv = _canMoveCourse(courseId, nextSemester, profile, graph)

    // if there is a dependent issue, push them
    while (!mv.canMove) {
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
          courseWithMostSlack.id
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
