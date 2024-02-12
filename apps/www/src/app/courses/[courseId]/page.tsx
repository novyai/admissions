import { getCourseWithPrereqs } from "@/db/courses"
import { HydratedCourse } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@ui/components/ui/card"
import { ActivitySquare } from "lucide-react"

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

// const CourseDetails = ({ course }: { course: HydratedCourse }) => {
//   return (
//     <>
//       <Card className="w-full backdrop-blur-sm bg-card/75">
//         <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//           <CardTitle className="text-sm font-medium">Course Summary</CardTitle>
//           <ActivitySquare className="h-4 w-4 text-muted-foreground" />
//         </CardHeader>
//         <CardContent>
//           <div className="text-2xl font-bold">GPA: {gpaStats?.gpa?.toFixed(2) ?? "--"}</div>
//           <p className="text-xs text-muted-foreground">
//             Total Credits: {gpaStats?.totalCredits ?? "--"}
//           </p>
//         </CardContent>
//       </Card>
//       <Card className="w-full backdrop-blur-sm bg-card/75">
//         <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//           <CardTitle className="text-sm font-medium">Course Summary</CardTitle>
//           <BookOpenCheck className="h-4 w-4 text-muted-foreground" />
//         </CardHeader>
//         <CardContent>
//           <div className="text-2xl font-bold">Completed: {gpaStats?.completedCourses ?? "--"}</div>
//           <p className="text-xs text-muted-foreground">Passed: {gpaStats?.passedCourses ?? "--"}</p>
//         </CardContent>
//       </Card>
//     </>
//   )
// }
