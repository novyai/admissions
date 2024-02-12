import { getCourseWithPrereqs } from "@/db/courses"
import { Card, CardContent, CardHeader } from "@ui/components/ui/card"

export default async function Page({
  params: { courseId }
}: {
  params: {
    courseId: string
  }
}) {
  const { course, prereqs } = await getCourseWithPrereqs(courseId, [])

  return (
    <div className="w-full h-full overflow-y-auto py-6 px-6">
      <div className="space-y-6 md:container">
        <div className="w-full sticky top-0 bg-background/50 backdrop-blur-md">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="scroll-m-20 text-3xl font-extrabold tracking-tight">{course.name}</h1>
              <small className="text-lg font-medium leading-none">
                {course.courseSubject} {course.courseNumber}
              </small>
            </div>
          </div>

          <pre>{JSON.stringify(course, null, 2)}</pre>
          <br />
          {prereqs ? <pre>{JSON.stringify(prereqs, null, 2)}</pre> : <p>No Prerequisites</p>}
        </div>
      </div>
    </div>
  )
}
