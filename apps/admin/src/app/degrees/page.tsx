import { db, Prisma } from "@db/client"
import cseDegree from "@db/test.json"
import { getStudentProfile } from "@repo/graph/profile"
import { BaseStudentProfile } from "@repo/graph/types"

import { CoursesGraph } from "@/components/courses-graph"
import { ScheduleTable } from "@/components/schedule-table"

export default async function Page() {
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

  const baseProfile: BaseStudentProfile = {
    requiredCourses: requiredCourses.map(course => course.id),
    transferCredits: [],
    timeToGraduate: 8,
    coursePerSemester: 5,
    currentSemester: 0
  }

  const profile = await getStudentProfile(baseProfile)

  // const calc2 = "faec91f2-461b-4bb7-b266-cd1307ecae4d"
  // const calc1 = "2e6b393e-1b5c-4a46-a5be-f62e41545748"
  // const calc3 = "e4ada3c1-f89a-48c6-bbcd-3a6165fce77d"
  // const precalc = "6b15a066-a434-499b-8b26-6179ff2dca19"

  // const mathProfile: StudentProfile = {
  //   requiredCourses: [calc3],
  //   completedCourses: [],
  //   timeToGraduate: 6
  // }

  return (
    <div className="p-4">
      <h1 className="text-3xl font-bold">Degree</h1>
      <ScheduleTable profile={profile} />
      <CoursesGraph graph={profile.graph} />
    </div>
  )
}
