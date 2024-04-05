import Graph from "graphology"
import { forEachTopologicalGeneration, topologicalGenerations } from "graphology-dag"
import { reverse } from "graphology-operators"
import { Attributes } from "graphology-types"

import { ConditionGroup, Course, db } from "../../db/src/client"
import { BaseStudentProfile, CourseNode, StudentProfile } from "./types"
import { graphtoStudentProfile } from "./graph"

type CourseAttributes = {
  semester?: number
} & Course & (
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

type EdgeAttributes = {
  type: "PREREQUISITE" | "COREQUISITE"
}

export type CourseGraph = Graph<CourseAttributes, EdgeAttributes, Attributes>

/**
 * Load all courses into a student's profile and build their schedule
 * @param profile the basic information about the student's profile
 */
export const getStudentProfileFromRequirements = async (
  profile: BaseStudentProfile
): Promise<StudentProfile> => {
  const graph: CourseGraph = new Graph()

  for (const courseId of profile.requiredCourses) {
    await addCourseToGraph(courseId, graph, profile.transferCredits, profile) // Await the completion of each addCourseToGraph call
  }

  computeNodeStats(graph, profile)

  scheduleCourses(graph, profile)

  graph.forEachNode((_courseId, course) => {
    console.log(
      `${course.courseSubject}-${course.courseNumber}: ${course.name} -- earliestFinish: ${course.earliestFinish} latestFinish: ${course.latestFinish} fanOut: ${course.fanOut} semester: ${course.semester}`
    )
  })

  return graphtoStudentProfile(graph, profile)
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

export async function addCourseToGraph(
  courseId: string,
  graph: CourseGraph,
  completedCourseIds: string[],
  profile: BaseStudentProfile
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
    id: course.id,
    courseSubject: course.courseSubject,
    courseNumber: course.courseNumber,
    name: course.name,
    departmentId: course.departmentId,
    universityId: course.universityId,

    startTerm: null,
    endTerm: null,

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

  if (course.conditions.length === 0) {
    return
  }

  // condition groups are implicitly ORed, so we only need to recurse down one.
  // recurse down the branch that has the most required courses.
  const conditionGroupsWithCounts = await Promise.all(course.conditions
    .map(async conditionGroup => ({
      conditionGroup: conditionGroup,
      requiredCoursesInTree: await countRequiredCoursesinConditionGroup(conditionGroup, profile)
    })))

  conditionGroupsWithCounts.sort((a, b) => b.requiredCoursesInTree - a.requiredCoursesInTree)

  const conditionGroup = conditionGroupsWithCounts[0]?.conditionGroup

  if (conditionGroup) {
    // for OR conditions, we only need to recurse down the condition that has the most required courses
    if (conditionGroup.logicalOperator === 'OR') {

      const conditionsWithCounts = await Promise.all(conditionGroup.conditions
        .filter(condition => condition.prerequisites.length > 0)
        .map(async condition => ({
          condition: condition,
          count: await countRequiredCoursesInPrerequisiteTree(condition.prerequisites[0]!.courseId, profile)
        })))
      
      const condition = conditionsWithCounts.reduce((acc, cur) => cur.count > acc.count ? cur : acc).condition

      for (const prerequisite of condition.prerequisites) {
        // if a course is completed, assume that it's prerequisites are completed
        if (courseIsCompleted) {
          completedCourseIds.push(prerequisite.courseId)
        }

        await addCourseToGraph(prerequisite.courseId, graph, completedCourseIds, profile)

        // edges represent prerequisites pointing at the course they are a prerequisite for
        if (!graph.hasDirectedEdge(prerequisite.courseId, course.id)) {
          graph.addDirectedEdge(prerequisite.courseId, course.id, { "type": condition.type })
        }
      }

    } else {
      for (const condition of conditionGroup.conditions) {
        for (const prerequisite of condition.prerequisites) {
          // if a course is completed, assume that it's prerequisites are completed
          if (courseIsCompleted) {
            completedCourseIds.push(prerequisite.courseId)
          }

          await addCourseToGraph(prerequisite.courseId, graph, completedCourseIds, profile)

          // edges represent prerequisites pointing at the course they are a prerequisite for
          if (!graph.hasDirectedEdge(prerequisite.courseId, course.id)) {
            graph.addDirectedEdge(prerequisite.courseId, course.id, { "type": condition.type })
          }
        }
      }
    }
  }
}

async function countRequiredCoursesinConditionGroup(conditionGroup: ConditionGroup & { conditions: ({ prerequisites: { id: string; conditionId: string; courseId: string }[] })[] }, profile: BaseStudentProfile) : Promise<number> {
  const conditionCounts : number[] = await Promise.all(conditionGroup.conditions
      .filter(condition => condition.prerequisites.length > 0)
      .map(async condition => await countRequiredCoursesInPrerequisiteTree(condition.prerequisites[0]!.courseId, profile)))

  if (conditionGroup.logicalOperator === 'OR') {
    return Math.max(...conditionCounts, 0)
  } else {
    return conditionCounts.reduce((acc, curr) => acc + curr, 0)
  }
}

async function countRequiredCoursesInPrerequisiteTree(courseId: string, profile: BaseStudentProfile) : Promise<number> {
   const course = await getCourseWithPreqs(courseId);
   if (course === null) {
    return 0
   }
   const conditionGroupCounts : number[] = await Promise.all(course.conditions.map(conditionGroup  => countRequiredCoursesinConditionGroup(conditionGroup, profile)))
   return (profile.requiredCourses.includes(courseId) ? 1 : 0) + Math.max(...conditionGroupCounts, 0)
}

export function computeNodeStats(graph: CourseGraph, profile: BaseStudentProfile) {
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
  var currentSemester = 1
  var coursesInCurrentSemester = 0
  var firstDeferredCourseId = null

  const sortedCourses = topologicalGenerations(graph).flatMap(courseGeneration =>
    courseGeneration
      // don't directly schedule corequisites -- we'll add them when we schedule their parent
      .filter(courseId => {
        const edges = graph.mapOutEdges(courseId, (_, edge) => edge.type)
        return edges.length === 0 || !edges.every(type => type === "COREQUISITE")
      })
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

    const allPrereqsCompleted = graph
        .filterInNeighbors(course.id, prereqId => graph.getEdgeAttribute(prereqId, course.id, "type") === "PREREQUISITE")
        .map(prereqId => graph.getNodeAttribute(prereqId, "semester"))
        .every(semester => semester! < currentSemester)

    const corequisites = graph.filterInEdges(course.id, (_, edge) => edge.type === 'COREQUISITE')
      .map(edgeId => graph.source(edgeId))
      .map(nodeId => graph.getNodeAttributes(nodeId))

    if (allPrereqsCompleted && (corequisites.length + coursesInCurrentSemester + 1 <= profile.coursePerSemester)) {
      // if all of the prereqs were completed in previous semesters, we can add this course to the current one
      updateSemesterInGraph(graph, course, currentSemester)
      coursesInCurrentSemester += 1

      for (const corequisite of corequisites) {
        updateSemesterInGraph(graph, corequisite, currentSemester)
        coursesInCurrentSemester += 1
      }
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

function updateSemesterInGraph(graph: CourseGraph, course: CourseAttributes, currentSemester: number) {
      console.log(
        `Adding ${course.courseSubject}-${course.courseNumber}: ${course.name} to schedule in semester ${currentSemester}`
      )
      graph.setNodeAttribute(course.id, "semester", currentSemester)
}


export function toCourseNode(graph: Graph, courseId: string, course: Attributes | undefined): CourseNode {
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
