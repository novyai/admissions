import { getCourseWithPrereqs } from "@/db/courses"

export default async function Page({
  params: { courseId }
}: {
  params: {
    courseId: string
  }
}) {
  const { course, prereqMap } = await getCourseWithPrereqs(courseId, [])
  console.log(prereqMap)
  // const allCourses = await getCourses(Array.from(prereqMap.keys()))

  return (
    <div className="w-full h-full overflow-y-auto py-6 px-6">
      <div className="space-y-6 md:container">
        <div className="w-full sticky top-0 bg-background/50 backdrop-blur-md">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="scroll-m-20 text-3xl font-extrabold tracking-tight">{course.name}</h1>
              <small className="text-lg font-medium leading-none">
                {course.department.code} {course.courseNumber}
              </small>
            </div>
          </div>

          <pre>{JSON.stringify(course, null, 2)}</pre>

          <br />
          {/* <h2>Prerequisites</h2>
          {Array.from(prereqMap.keys()).map((courseId, level) => {
            const course = allCourses.find(course => course.id === courseId)
            if (!course) return null

            const preq = prereqMap.get(courseId)
            return (
              <div key={courseId}>
                <h3 className="text-lg">{`${level}: ${course?.department.code} ${course?.courseNumber}`}</h3>
                <p className="pl-2">
                  {preq && preq.length > 0
                    ? Array.from(preq).map(p => {
                      const course = allCourses.find(course => course.id === p)
                      return (
                        <p
                          key={p}
                          className="text-md"
                        >{`${course?.department.code} ${course?.courseNumber} - ${course?.name}`}</p>
                      )
                    })
                    : "No prerequisites found."}
                </p>
              </div>
            )
          })} */}
        </div>
      </div>
    </div>
  )
}
