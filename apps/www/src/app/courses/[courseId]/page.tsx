import { getCourseWithPrereqs } from "@/db/courses"

export default async function Page({
  params: { courseId }
}: {
  params: {
    courseId: string
  }
}) {
  const { course, prereqs } = await getCourseWithPrereqs(courseId, [])

  return (
    <div className="w-full h-full overflow-y-auto">
      <div className="space-y-6 md:container">
        <div className="w-full sticky top-0 bg-background/50 backdrop-blur-md">
          <div className="py-6 px-6 flex justify-between items-center">
            <div>
              <h1 className="scroll-m-20 text-3xl font-extrabold tracking-tight">{course.name}</h1>
              <small className="text-sm font-medium leading-none">
                {course.courseSubject} {course.courseNumber}
              </small>
            </div>
            <div>{/* <StudentCommand studentId={params.studentId} /> */}</div>
          </div>
          <div className="flex flex-col md:flex-row items-center justify-between gap-2 px-4">
            {/* <StudentSummary gpaStats={gpaStats} /> */}
          </div>

          <p>{JSON.stringify(course)}</p>
          <br />
          <pre>{JSON.stringify(prereqs, null, 2)}</pre>
        </div>
      </div>
    </div>
  )
}
