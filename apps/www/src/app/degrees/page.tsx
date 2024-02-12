import { getDegreeData } from "@/db/degree"
import { Prisma } from "@db/client"
import cseDegree from "@db/data/test.json"

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

  const { schedule, allCourses, missingCourses } = await getDegreeData(deptCourses)

  return (
    <>
      <h1 className="text-3xl font-bold mb-4">Degree</h1>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h2 className="text-2xl font-bold mb-4">Courses</h2>
          <p>
            total courses: {allCourses.length} | missing courses: {missingCourses.length}
          </p>

          {/* <p>course with dependencies as graph</p> */}
          {/* <pre>{JSON.stringify(graph, null, 2)}</pre> */}

          {/* <pre>{JSON.stringify(schedule, null, 2)}</pre> */}

          <p>Schedule</p>

          <ul>
            {schedule.map((semester, i) => {
              return (
                <li key={i}>
                  <h3>Semester {i + 1}</h3>
                  <ul>
                    {semester.map((course, j) => {
                      const courseData = allCourses.find(c => c.id === course)
                      return (
                        <li key={j}>
                          {courseData?.department?.code} {courseData?.courseNumber}
                        </li>
                      )
                    })}
                  </ul>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </>
  )
}
