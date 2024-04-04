import { getStudentGPA, getTranscriptForStudent } from "@/db/students"
import { HydratedUniversityGrade } from "@/types"
import { TransferGrade } from "@db/client"
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/ui/card"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@repo/ui/components/ui/table"
import { ActivitySquare, BookOpenCheck } from "lucide-react"

import { parseTermCode } from "@/lib/courses"

export function StudentSummary({
  gpaStats
}: {
  gpaStats: Awaited<ReturnType<typeof getStudentGPA>>
}) {
  return (
    <>
      <Card className="w-full backdrop-blur-sm bg-card/75">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Academic Summary</CardTitle>
          <ActivitySquare className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">GPA: {gpaStats?.gpa?.toFixed(2) ?? "--"}</div>
          <p className="text-xs text-muted-foreground">
            Total Credits: {gpaStats?.totalCredits ?? "--"}
          </p>
        </CardContent>
      </Card>
      <Card className="w-full backdrop-blur-sm bg-card/75">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Course Summary</CardTitle>
          <BookOpenCheck className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">Completed: {gpaStats?.completedCourses ?? "--"}</div>
          <p className="text-xs text-muted-foreground">Passed: {gpaStats?.passedCourses ?? "--"}</p>
        </CardContent>
      </Card>
    </>
  )
}

export function UniversityGradesTable({ grades }: { grades: HydratedUniversityGrade[] }) {
  return (
    <>
      <Table>
        <TableCaption>Your University Grades</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Term</TableHead>
            <TableHead>Course</TableHead>
            <TableHead>Grade</TableHead>
            <TableHead className="text-right">Credit Hours</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {grades.map((grade, index) => {
            const parsedTerm = parseTermCode(grade.term)
            return (
              <TableRow key={index}>
                <TableCell>
                  {parsedTerm.semester} {parsedTerm.year}
                </TableCell>
                <TableCell>
                  {grade.course.name} (
                  {`${grade.course.courseSubject} ${grade.course.courseNumber}`})
                </TableCell>
                <TableCell>{grade.finalGrade}</TableCell>
                <TableCell className="text-right">{grade.creditHours}</TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </>
  )
}

export function TransferGradesTable({ grades }: { grades: TransferGrade[] }) {
  return (
    <>
      <Table>
        <TableCaption>Your Transfer Grades</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Term</TableHead>
            <TableHead>Course</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Grade</TableHead>
            <TableHead className="text-right">Credit Hours</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {grades.map((grade, index) => {
            const parsedTerm = parseTermCode(grade.term)
            return (
              <TableRow key={index}>
                <TableCell>
                  {parsedTerm.semester} {parsedTerm.year}
                </TableCell>
                <TableCell>
                  {" "}
                  {grade?.courseTitle} ({`${grade.courseSubject} ${grade.courseNumber}`})
                </TableCell>
                <TableCell>{grade.sbgiDesc}</TableCell>
                <TableCell>{grade.equivalentGrade}</TableCell>
                <TableCell className="text-right">{grade.creditHours}</TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </>
  )
}

export async function Transcript({ studentId }: { studentId: string }) {
  const student = await getTranscriptForStudent({ studentId })
  const gpaStats = await getStudentGPA({ studentId })

  return (
    <>
      <div className="p-6 pb-2">
        <h3>
          Transcript for {student.user.firstName} {student.user.lastName}
        </h3>
      </div>
      <div className="space-y-6 max-h-[60vh] overflow-y-auto">
        <div className="flex items-center justify-between gap-2 w-full sticky top-0 bg-background/50 backdrop-blur-sm px-4 ">
          <StudentSummary gpaStats={gpaStats} />
        </div>
        <div className="p-4">
          <h2>University Grades</h2>
          <UniversityGradesTable grades={student.universityGrades} />
        </div>

        <div className="p-4">
          <h2>Transfer Grades</h2>
          <TransferGradesTable grades={student.transferGrades} />
        </div>
      </div>
    </>
  )
}
