import Graph from "graphology"
import { forEachTopologicalGeneration, topologicalGenerations } from "graphology-dag"
import { reverse } from "graphology-operators"
import { Attributes } from "graphology-types"
import { XYPosition } from "reactflow"

import { db } from "../../db/src/client"
import { BaseStudentProfile, CourseNode, StudentProfile } from "./types"

type CourseAttributes = {
  semester?: number
} & (
  | (Exclude<Awaited<ReturnType<typeof getCourseWithPreqs>>, null> & {
      hasAttributes: false
      fanOut: undefined
      earliestFinish: undefined
      latestFinish: undefined
      slack: undefined
    })
  | (Exclude<Awaited<ReturnType<typeof getCourseWithPreqs>>, null> & {
      hasAttributes: true
      fanOut: number
      earliestFinish: number
      latestFinish: number
      slack: number
    })
)

type CustomGraph = Graph<CourseAttributes, Attributes, Attributes>
/**
 * Load all courses into a student's profile and build their schedule
 * @param profile the basic information about the student's profile
 */
export const getStudentProfileFromRequirements = async (
  profile: BaseStudentProfile
): Promise<StudentProfile> => {
  const graph: CustomGraph = new Graph()

  for (const courseId of profile.requiredCourses) {
    await addCourseToGraph(courseId, graph, profile.transferCredits) // Await the completion of each addCourseToGraph call
  }

  computeNodeStats(graph, profile)

  scheduleCourses(graph, profile)

  graph.forEachNode((_courseId, course) => {
    console.log(
      `${course.courseSubject}-${course.courseNumber}: ${course.name} -- earliestFinish: ${course.earliestFinish} latestFinish: ${course.latestFinish} fanOut: ${course.fanOut} semester: ${course.semester}`
    )
  })
  const allCourses: CourseNode[] = graph.mapNodes((courseId, course) =>
    toCourseNode(graph, courseId, course)
  )
  return {
    ...profile,
    allCourses: allCourses,
    graph: allCourses.reduce(
      (acc, course) => acc.set(course.id, course),
      new Map<string, CourseNode>()
    ),
    semesters: buildSemesters(graph)
  }
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

async function addCourseToGraph(
  courseId: string,
  graph: CustomGraph,
  completedCourseIds: string[]
) {
  // check if the course is already in the graph, if it is, exit
  if (graph.hasNode(courseId)) {
    return // Make sure to return here to prevent further execution when the node exists
  }

  // find the course in the db, and add it to the graph
  const course = await getCourseWithPreqs(courseId)
  if (course === null) {
    throw Error(`Course with id ${courseId} not found in DB`)
  }

  graph.addNode(courseId, {
    ...course,
    hasAttributes: false,
    fanOut: undefined,
    earliestFinish: undefined,
    latestFinish: undefined,
    slack: undefined
  })

  const courseIsCompleted = completedCourseIds.includes(courseId)
  if (courseIsCompleted) {
    graph.setNodeAttribute(courseId, "semester", 0) // previously completed courses have a semester of 0
  }

  // recurse to any prerequisites so that we can add edges
  for (const conditionGroup of course.conditions) {
    for (const condition of conditionGroup.conditions) {
      for (const prerequisite of condition.prerequisites) {
        // if a course is completed, assume that it's prerequisites are completed
        if (courseIsCompleted) {
          completedCourseIds.push(prerequisite.courseId)
        }

        await addCourseToGraph(prerequisite.courseId, graph, completedCourseIds)

        // edges represent prerequisites pointing at the course they are a prerequisite for
        if (!graph.hasDirectedEdge(prerequisite.courseId, course.id)) {
          graph.addDirectedEdge(prerequisite.courseId, course.id)
        }
      }
    }
  }
}

function computeNodeStats(graph: CustomGraph, profile: BaseStudentProfile) {
  var semester = 1
  forEachTopologicalGeneration(graph, coursesInGeneration => {
    coursesInGeneration.forEach(courseId => {
      if (semester === 1) {
        calculateFanOut(graph, courseId)
      }
      graph.setNodeAttribute(courseId, "earliestFinish", semester)
    })
    semester += 1
  })

  var semester = profile.timeToGraduate
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
function calculateFanOut(graph: CustomGraph, courseId: string): number {
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
function scheduleCourses(graph: CustomGraph, profile: BaseStudentProfile) {
  var currentSemester = 1
  var coursesInCurrentSemester = 0
  var firstDeferredCourseId = null

  const sortedCourses = topologicalGenerations(graph).flatMap(courseGeneration =>
    courseGeneration
      .map(courseId => graph.getNodeAttributes(courseId))
      .sort((courseA, courseB) => (courseA.slack ?? 0) - (courseB.slack ?? 0))
  )

  while (sortedCourses.length > 0) {
    const course = sortedCourses.shift()!

    if (course.semester === 0) {
      // course is already completed, skip scheduling
      continue
    }

    // check if the semester is full already and increment if it is
    if (
      coursesInCurrentSemester >= profile.coursePerSemester ||
      course["id"] === firstDeferredCourseId
    ) {
      console.log(`Semester ${currentSemester} complete`)
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
      console.log(
        `Adding ${course["courseSubject"]}-${course["courseNumber"]}: ${course["name"]} to schedule in semester ${currentSemester}`
      )
      graph.setNodeAttribute(course["id"], "semester", currentSemester)
      coursesInCurrentSemester += 1
    } else {
      // otherwise we need to defer this course
      console.log(
        `Deferring ${course["courseSubject"]}-${course["courseNumber"]}: ${course["name"]} to schedule in semester ${currentSemester}`
      )
      if (firstDeferredCourseId === null) {
        firstDeferredCourseId = course["id"]
      }
      sortedCourses.push(course)
    }
  }
}

function toCourseNode(graph: Graph, courseId: string, course: Attributes): CourseNode {
  return {
    id: courseId,
    name: course["name"],

    earliestFinish: course["earliestFinish"],
    latestFinish: course["latestFinish"],
    fanOut: course["fanOut"],

    dependents: graph.mapOutboundNeighbors(courseId, dependentId => dependentId),
    prerequisites: graph.mapInboundNeighbors(courseId, prereqId => prereqId),

    raw_course: {
      id: courseId,
      name: course["name"],
      courseSubject: course["courseSubject"],
      courseNumber: course["courseNumber"],
      departmentId: course["departmentId"],
      universityId: course["universityId"],

      startTerm: course["startTerm"],
      endTerm: course["endTerm"]
    }
  }
}

function buildSemesters(graph: Graph): CourseNode[][] {
  const semesters: CourseNode[][] = graph
    .mapNodes((courseId, course) => toCourseNode(graph, courseId, course))
    .reduce((acc: CourseNode[][], course: CourseNode) => {
      const semesterIndex: number = graph.getNodeAttribute(course.id, "semester")
      if (semesterIndex > 0) {
        // courses with a semesterIndex of 0 are already completed
        acc[semesterIndex - 1] = acc[semesterIndex - 1] || []
        acc[semesterIndex - 1]?.push(course)
      }
      return acc
    }, [])
  return semesters
}

export async function getProfileFromSchedule(blob: string): Promise<StudentProfile> {
  const { profile, nodes } = JSON.parse(blob) as {
    profile: BaseStudentProfile & { semesters: string[][] }
    nodes: {
      id: string
      position: XYPosition
    }[]
  }

  const graph: CustomGraph = new Graph()

  for (const node of nodes) {
    await addCourseToGraph(node.id, graph, profile.transferCredits) // Await the completion of each addCourseToGraph call
  }

  computeNodeStats(graph, profile)

  const allCourses: CourseNode[] = graph.mapNodes((courseId, course) =>
    toCourseNode(graph, courseId, course)
  )

  return {
    ...profile,
    allCourses: allCourses,
    graph: allCourses.reduce(
      (acc, course) => acc.set(course.id, course),
      new Map<string, CourseNode>()
    ),
    semesters: profile.semesters.map(s =>
      s.map(c => toCourseNode(graph, c, graph.getNodeAttributes(c)))
    )
  }
}
