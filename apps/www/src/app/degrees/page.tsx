import { getDegree, StudentProfile } from "@/db/graph"
import { db, Prisma } from "@db/client"
import cseDegree from "@db/data/test.json"

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

  console.log(requiredCourses.map(course => course.name))

  const cseProfile: StudentProfile = {
    requiredCourses: requiredCourses.map(course => course.id),
    completedCourses: [],
    timeToGraduate: 8
  }

  const graph = await getDegree(cseProfile)

  return (
    <div className="p-4">
      <h1 className="text-3xl font-bold">Degree</h1>

      <ScheduleTable graph={graph} profile={cseProfile} />
    </div>
  )
}
