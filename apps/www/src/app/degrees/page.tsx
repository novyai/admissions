import { getDegreeData } from "@/db/degree"
import { getDegree, StudentProfile } from "@/db/graph"
import { db, Prisma } from "@db/client"
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

  const sortedCourses = Array.from(graph.values()).sort(
    (a, b) => a.earliestFinish! - b.earliestFinish!
  )

  const showPrereqs = true

  return (
    <>
      <h1 className="text-3xl font-bold mb-4">Degree</h1>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h2 className="text-2xl font-bold mb-4">Courses</h2>
          {/* <p>
            total courses: {allCourses.length} | missing courses: {missingCourses.length}
          </p> */}

          {/* <p>course with dependencies as graph</p> */}
          {/* <pre>{JSON.stringify(graph, null, 2)}</pre> */}

          {/* <pre>{JSON.stringify(schedule, null, 2)}</pre> */}

          <p>Schedule</p>

          <ul className="pl-4">
            <li>name | slack | earliest finish | latest finish</li>
            {sortedCourses.map((course, i) => {
              return (
                <li key={i}>
                  {course.name} - {course.latestFinish! - course.earliestFinish!} -{" "}
                  {course.earliestFinish!} - {course.latestFinish!}
                  <br />
                  {showPrereqs &&
                    course.prerequisites.map(p => {
                      const prereq = graph.get(p)
                      return (
                        <span className="pl-2" key={p}>
                          {prereq?.name} - {prereq?.latestFinish! - prereq?.earliestFinish!} -{" "}
                          {prereq?.earliestFinish!} - {prereq?.latestFinish!}
                          <br />
                        </span>
                      )
                    })}
                </li>
              )
            })}
          </ul>

          {/* <ul>
            {schedule.map((semester, i) => {
              return (
                <li key={i}>
                  <h3>Semester {i + 1}</h3>
                  <ul>
                    {semester.map((course, j) => {
                      const courseData = allCourses.find(c => c.id === course)
                      return <li key={j}>{courseData?.name}</li>
                    })}
                  </ul>
                </li>
              )
            })}
          </ul> */}
        </div>
      </div>
    </>
  )
}
