import { getStudentProfile } from "@/actions/schedule"
import cseDegree from "@/cse_requirments.json"
import { db, Prisma } from "@db/client"
import { BaseStudentProfile } from "@graph/types"

import { Chat } from "@/components/chat"
import { CoursesGraph } from "@/components/courses-graph"
import { ScheduleTable } from "@/components/schedule-table"

export default async function Page({ params }: { params: { studentId: string } }) {
  const student = await db.user.findUnique({
    where: {
      id: params.studentId
    }
  })

  if (!student) {
    return <div>Student not found</div>
  }

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
    timeToGraduate: 10,
    coursePerSemester: 6
  }

  const studentProfile = await getStudentProfile(baseProfile)

  return (
    <div className="overflow-y-scroll p-4">
      <p>{`Chat for student ${student?.studentId}`}</p>

      <pre>
        {JSON.stringify(
          {
            ...student,
            timeToGraduate: studentProfile.timeToGraduate,
            coursePerSemester: studentProfile.coursePerSemester
          },
          null,
          2
        )}
      </pre>

      <Chat student={student} studentProfile={studentProfile} />
      {/* <CoursesGraph graph={studentProfile.graph} /> */}
      {/* <ScheduleTable profile={studentProfile} /> */}
    </div>
  )
}
