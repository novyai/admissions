import { getStudentProfile } from "@/actions/schedule"
import cseDegree from "@/cse_requirments.json"
import { db, Prisma } from "@db/client"
import { BaseStudentProfile } from "@graph/types"

import { SemesterDAG } from "@/components/semester-dag"

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

  const precalc = "6b15a066-a434-499b-8b26-6179ff2dca19"

  const baseProfile: BaseStudentProfile = {
    requiredCourses: requiredCourses.map(course => course.id),
    transferCredits: [precalc],
    timeToGraduate: 8,
    coursePerSemester: 6,
    currentSemester: 0
  }

  const studentProfile = await getStudentProfile(baseProfile)

  return (
    <>
      <SemesterDAG studentProfile={studentProfile} />
      {/* <DagChat studentProfile={studentProfile} /> */}
    </>
  )
}
