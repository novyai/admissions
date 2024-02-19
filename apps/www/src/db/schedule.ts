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
  timeToGraduate: 7
}

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

  const requiredCourses = getAllRequiredCourses(course.id, degreeData).filter(c => c !== course.id)

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
      addToSemester(course, semesters, 0)
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
        addToSemester(course, semesters, index + 1)
        break
      }
    }
  } else {
    // if not all required courses are found, add to the end of the queue
    queue.push(course)
  }

  //   //   // check if all required courses are found
}

for (let index = 0; index < semesters.length; index++) {
  console.log(`Semester ${index + 1}: ${semesters[index]?.map(c => c.name)}`)
}

/**
 * Add a course to a semester, or a future semester if the current semester is full
 * @param course The course to add
 * @param semesters The schedule of semesters to add the course to
 * @param semester The semester index to add the course to
 */
function addToSemester(course: CourseNode, semesters: CourseNode[][], semester: number) {
  if (semester >= profile.timeToGraduate || semesters.length >= profile.timeToGraduate) {
    throw new Error(`Can only have ${profile.timeToGraduate} semesters`)
  }
  if (semesters[semester]) {
    if (semesters[semester]?.length === 4) {
      addToSemester(course, semesters, semester + 1)
    } else {
      semesters[semester]?.push(course)
    }
  } else {
    semesters.push([course])
  }
}
