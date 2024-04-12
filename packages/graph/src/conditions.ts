import { CourseGraph, CoursePayload } from "./course"

export function countRequiredCoursesInConditionGroup(
  conditionGroup: CoursePayload["conditions"][number],
  graph: CourseGraph,
  courseMap: Map<string, CoursePayload>,
  requiredCourses: string[]
) {
  const conditionCounts = conditionGroup.conditions
    .filter(condition => condition.prerequisites.length > 0)
    .map(condition =>
      countRequiredCoursesInPrerequisiteTree(
        condition.prerequisites[0]!.courseId,
        graph,
        courseMap,
        requiredCourses
      )
    )

  if (conditionGroup.logicalOperator === "OR") {
    return Math.max(...conditionCounts, 0)
  } else {
    return conditionCounts.reduce((acc, curr) => acc + curr, 0)
  }
}

export function countRequiredCoursesInPrerequisiteTree(
  courseId: string,
  graph: CourseGraph,
  courseMap: Map<string, CoursePayload>,
  requiredCourses: string[]
) {
  const course = courseMap.get(courseId)
  if (!course) {
    return 0
  }
  const conditionGroupCounts: number[] = course.conditions.map(conditionGroup =>
    countRequiredCoursesInConditionGroup(conditionGroup, graph, courseMap, requiredCourses)
  )

  return (requiredCourses.includes(courseId) ? 1 : 0) + Math.max(...conditionGroupCounts, 0)
}
