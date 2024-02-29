import { getStudentProfile } from "@/actions/schedule"
import cseDegree from "@/cse_requirments.json"
import { db, Prisma } from "@db/client"
import { BaseStudentProfile } from "@graph/types"

import { CoursesGraph } from "@/components/courses-graph"

export default async function Page() {
  const deptCourses = cseDegree.map((course): Prisma.CourseWhereInput => {
    return {
      department: {
        code: course.course_dept
      },
      courseNumber: course.course_code
    }
  })

  const requiredCourses = await db.course.findMany({
    where: {
      OR: deptCourses
    },
    select: {
      id: true
    }
  })

  const baseProfile: BaseStudentProfile = {
    requiredCourses: requiredCourses.map(course => course.id),
    timeToGraduate: 8,
    coursePerSemester: 6,
    currentSemester: 0
  }

  const studentProfile = await getStudentProfile(baseProfile)

  return <CoursesGraph graph={studentProfile.graph} />
}
