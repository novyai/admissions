"use client"

import { useState } from "react"
import { UniversityPrograms } from "@/types"
import { z } from "zod"

import StudentCoursesForm from "@/components/createNewSchedule/student-courses-form"
import { StudentInfoForm } from "@/components/createNewSchedule/student-info-form"

export const SEMESTER_OPTIONS = ["FALL", "SPRING"] as const
export const SemesterEnum = z.enum(SEMESTER_OPTIONS)
type Semester = z.infer<typeof SemesterEnum>

// const UniversityProgram = z.object({
//   value: z.string(),
//   label: z.string(),
//   id: z.string(),
//   universityId: z.string()
// })
// type UniversityProgramType = z.infer<typeof UniversityProgram>

export interface StudentInfo {
  majors: string[]
  university: string
  yearStart?: number
  semesterStart?: Semester
}

const getStartYearOptions = (): number[] => {
  const currentYear = new Date().getFullYear()
  const yearOffsets = [-3, -2, -1, 0, 1]
  return yearOffsets.map(offset => currentYear + offset)
}

export default function CreateForms({
  universityPrograms
}: {
  userId: string
  universityPrograms: UniversityPrograms[]
}) {
  const [selectedFormIndex, setSelectedFormIndex] = useState(0)

  const yearStartOptions = getStartYearOptions()

  const [studentInfo, setStudentInfo] = useState<StudentInfo>()

  const handleStudentInfoFormSubmit = (studentInfo: StudentInfo) => {
    setSelectedFormIndex(selectedFormIndex + 1)
    setStudentInfo(studentInfo)
  }

  studentInfo

  return (
    <>
      <StudentInfoForm
        formIndex={0}
        selectedFormIndex={selectedFormIndex}
        universityPrograms={universityPrograms}
        yearStartOptions={yearStartOptions}
        handleSubmit={handleStudentInfoFormSubmit}
      />
      <StudentCoursesForm formIndex={1} selectedFormIndex={selectedFormIndex} />
    </>
  )
}
