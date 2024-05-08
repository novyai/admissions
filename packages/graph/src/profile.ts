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
  NegativeScheduleConstraint,
  PositiveScheduleConstraint,
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
    // fill out nonOverlapping reqs first so we don't run out of courses for that req
    const sortedReqs = [...track.requirements]
    sortedReqs.sort((reqA, reqB) => {
      if (reqA.nonOverlapping === reqB.nonOverlapping) return 0
      return reqA.nonOverlapping ? -1 : 1
    })
    for (const requirement of sortedReqs) {
      const requirementCourses = []
      let totalCreditHours = 0
      let courseIndex = 0
      const validCourseOptions =
        requirement.nonOverlapping ?
          requirement.courses.filter(c => !requiredCoursesSet.has(c.id))
        : requirement.courses

      while (totalCreditHours < requirement.creditHoursNeeded) {
        if (courseIndex === validCourseOptions.length) {
          console.log(
            `requirement.courses (length ${requirement.courses.length})`,
            requirement.courses.map(c => ({
              name: c.name,
              creditHours: c.creditHours
            }))
          )
          console.log("validCourseOptions", validCourseOptions.length)
          throw Error(
            `validCourseOptions was not enough to fulfill requirement ${requirement.id} needing ${requirement.creditHoursNeeded} credit hours`
          )
        }
        const course = validCourseOptions[courseIndex]
        requirementCourses.push(course)
        totalCreditHours += course.creditHours
        courseIndex += 1
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
  profile: BaseStudentProfile,
  courseId: string
): { graph: CourseGraph; changes: Change[] } {
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
      changes: pushedChanges
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
