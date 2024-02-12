import { getRequiredCoursesForDegree } from "@/db/degree"
import { CourseWithPrereqs } from "@/types"
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

  const courseData = await getRequiredCoursesForDegree(deptCourses)

  // find courses that are missing:
  const missingCourses = deptCourses.filter(course => {
    return !courseData.some(
      c =>
        c.course.courseNumber === course.courseNumber &&
        c.course.department.code === course?.department?.code
    )
  })

  return (
    <>
      <h1 className="text-3xl font-bold mb-4">Degree</h1>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h2 className="text-2xl font-bold mb-4">Courses</h2>
          <p>{missingCourses.length} missing courses</p>

          <p>Courses with their dependencies</p>
          <ul>
            {courseData.map(course => {
              return <RenderCourseWithPrereqs key={course.course.id} course={course} />
            })}
          </ul>
        </div>
      </div>
    </>
  )
}

const RenderCourseWithPrereqs = ({ course }: { course: CourseWithPrereqs }) => {
  return (
    <li key={course.course.id} className="pl-2">
      {course.course.department.code} {course.course.courseNumber}
      {course.prereqs && (
        <ul>
          {course.prereqs.map((prereq, i) => {
            return <RenderCourseWithPrereqs key={i} course={prereq} />
          })}
        </ul>
      )}
    </li>
  )
}
