"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { SemesterYearType } from "@graph/types"

import { calculateSemesterDifference as calculateNumSemestersFromTerm } from "@/lib/schedule/utils"
import { createNewSchedule, UniversityProgram } from "@/components/createNewSchedule/action"
import StudentCoursesForm, {
  CoursesInfo
} from "@/components/createNewSchedule/student-courses-form"
import { StudentInfoForm } from "@/components/createNewSchedule/student-info-form"

export interface StudentInfo {
  tracks: string[]
  universityId: string
  start: SemesterYearType
}

export interface CourseIdName {
  id: string
  name: string
}

const getStartYearOptions = (): number[] => {
  const currentYear = new Date().getFullYear()
  const yearOffsets = [-3, -2, -1, 0, 1]
  return yearOffsets.map(offset => currentYear + offset)
}

export default function CreateForms({
  userId,
  universityPrograms
}: {
  userId: string
  universityPrograms: UniversityProgram[]
}) {
  const router = useRouter()

  const [selectedFormIndex, setSelectedFormIndex] = useState(0)
  const [studentInfo, setStudentInfo] = useState<StudentInfo>()
  const [courseOptions, setCourseOptions] = useState<CourseIdName[]>([])

  const handleStudentInfoFormSubmit = async (studentInfo: StudentInfo) => {
    if (calculateNumSemestersFromTerm(studentInfo.start) < 1) {
      const scheduleId = await createNewSchedule(userId, studentInfo.tracks, studentInfo.start)
      router.push(`/schedule/${scheduleId}`)
      return
    }

    setSelectedFormIndex(selectedFormIndex + 1)
    setStudentInfo(studentInfo)
    setCourseOptions([])
  }

  const handleCoursesFormSubmit = async (coursesInfo: CoursesInfo) => {
    if (studentInfo === undefined) {
      throw Error("studentInfo is undefined")
    }
    const scheduleId = await createNewSchedule(
      userId,
      studentInfo.tracks,
      studentInfo.start,
      coursesInfo
    )
    router.push(`/schedule/${scheduleId}`)
  }

  return (
    selectedFormIndex === 0 ?
      <StudentInfoForm
        universityPrograms={universityPrograms}
        yearStartOptions={getStartYearOptions()}
        handleSubmit={handleStudentInfoFormSubmit}
      />
    : selectedFormIndex === 1 ?
      <StudentCoursesForm
        studentInfo={studentInfo}
        handleSubmit={handleCoursesFormSubmit}
        courses={courseOptions}
      />
    : <></>
  )
}
