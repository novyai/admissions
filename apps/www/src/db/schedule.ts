import { getDegree } from "@/app/degrees/action"
import { db, Prisma } from "@db/client"
import cseDegree from "@db/test.json"

import { CourseNode, getAllRequiredCourses, StudentProfile } from "./graph"

// const calc3 = "e4ada3c1-f89a-48c6-bbcd-3a6165fce77d"
// const profile: StudentProfile = {
//   requiredCourses: [calc3],
//   completedCourses: [],
//   timeToGraduate: 6
// }

const deptCourses = Object.keys(cseDegree.Courses).map((course): Prisma.CourseWhereInput => {
  const [dept, num] = course.split(" ")
  return {
    department: {
      code: dept
    },
    courseNumber: num
  }
})

const requiredCourses = await db.course.findMany({
  where: {
    OR: deptCourses
  },
  select: {
    id: true,
    name: true
  }
})

const profile: StudentProfile = {
  requiredCourses: requiredCourses.map(course => course.id),
  completedCourses: ["faec91f2-461b-4bb7-b266-cd1307ecae4d"],
  timeToGraduate: 8,
  coursePerSemester: 4
}

const getSchedule = async (profile: StudentProfile) => {
  const degreeData = await getDegree(profile)

  const allCourses = Array.from(degreeData.values())

  // I want to sort all courses by earliest finish time, then slack

  const sortedCourses = allCourses.sort((a, b) => {
    if (a.earliestFinish === b.earliestFinish) {
      const aslack = a.latestFinish! - a.earliestFinish!
      const bslack = b.latestFinish! - b.earliestFinish!
      return aslack - bslack
    }
    return a.earliestFinish! - b.earliestFinish!
  })

  const semesters: CourseNode[][] = [[]]

  const queue = [...sortedCourses]
  while (queue.length > 0) {
    const course = queue.shift()!

    const requiredCourses = getAllRequiredCourses(course.id, degreeData).filter(
      c => c !== course.id
    )

    const uncompletedRequiredCourses = requiredCourses.filter(
      c =>
        !semesters
          .flat()
          .map(c => c.id)
          .includes(c)
    )

    // if all required courses are found, we can add to a semester
    if (uncompletedRequiredCourses.length === 0) {
      // if there are no required courses, add to the first semester
      if (requiredCourses.length === 0) {
        addToSemester(course, semesters, 0, profile)
        continue
      }

      // otherwise, find semester where this class can be placed
      const allLeftoverRequiredCourses = [...requiredCourses]

      for (let index = 0; index < semesters.length; index++) {
        const upToSemester = semesters.slice(0, index + 1).flat()

        // get all courses up to this semester and check if all required courses are found
        const leftoverRequiredCourses = allLeftoverRequiredCourses.filter(
          c => !upToSemester.map(c => c.id).includes(c)
        )

        // if all required courses are found in the current semester, add to the next semester
        if (leftoverRequiredCourses.length === 0) {
          addToSemester(course, semesters, index + 1, profile)
          break
        }
      }
    } else {
      // if not all required courses are found, add to the end of the queue
      queue.push(course)
    }

    //   //   // check if all required courses are found
  }
  return semesters
}

const semesters = await getSchedule(profile)

for (let index = 0; index < semesters.length; index++) {
  console.log(`Semester ${index + 1}: ${semesters[index]?.map(c => c.name)}`)
}

/**
 * Add a course to a semester, or a future semester if the current semester is full
 * @param course The course to add
 * @param semesters The schedule of semesters to add the course to
 * @param semester The semester index to add the course to
 */
export function addToSemester(
  course: CourseNode,
  semesters: CourseNode[][],
  semester: number,
  profile: StudentProfile
) {
  if (semester >= profile.timeToGraduate || semesters.length >= profile.timeToGraduate) {
    throw new Error(`Can only have ${profile.timeToGraduate} semesters`)
  }
  if (semesters[semester]) {
    if (semesters[semester]?.length! >= profile.coursePerSemester) {
      addToSemester(course, semesters, semester + 1, profile)
    } else {
      semesters[semester]?.push(course)
    }
  } else {
    semesters.push([course])
  }
}

/**
 * Checks if a course can be moved to a different semester without violating prerequisites and graduation time.
 * @param courseId The ID of the course to move.
 * @param fromSemester The current semester index of the course.
 * @param toSemester The target semester index to move the course to.
 * @param semesters The current schedule of semesters.
 * @param degreeData The degree data containing course prerequisites.
 * @returns {boolean} True if the course can be moved, false otherwise.
 */
export function canMoveCourse(
  courseId: string,
  fromSemester: number,
  toSemester: number,
  semesters: CourseNode[][],
  degreeData: Map<string, CourseNode>
): boolean {
  if (toSemester >= profile.timeToGraduate) {
    console.error("Cannot move course beyond the student's time to graduate.")
    return false
  }

  // Ensure the course exists in the fromSemester
  if (!semesters[fromSemester]?.find(c => c.id === courseId)) {
    console.error("Course not found in the specified fromSemester.")
    return false
  }

  // Check if moving the course violates any prerequisite requirements
  const coursePrerequisites = getAllRequiredCourses(courseId, degreeData)
  for (const prereqId of coursePrerequisites) {
    // Find the semester of the prerequisite course
    const prereqSemesterIndex = semesters.findIndex(semester =>
      semester.some(c => c.id === prereqId)
    )
    if (prereqSemesterIndex >= toSemester) {
      console.error("Moving the course violates prerequisite requirements.")
      return false
    }
  }

  // Check if the target semester has space
  if ((semesters[toSemester]?.length ?? 0) >= 4) {
    console.error("The target semester is full.")
    return false
  }

  return true
}
