"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { UniversityPrograms } from "@/types"
import { Program } from "@graph/defaultCourses"
import { SemesterYearType } from "@graph/types"

import {
  createNewSchedule,
  getAllComputerScienceCoursesForUniversity
} from "@/components/createNewSchedule/action"
import StudentCoursesForm, {
  CoursesInfo
} from "@/components/createNewSchedule/student-courses-form"
import { StudentInfoForm } from "@/components/createNewSchedule/student-info-form"

export interface StudentInfo {
  majors: Program[]
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
  universityPrograms: UniversityPrograms[]
}) {
  const router = useRouter()

  const [selectedFormIndex, setSelectedFormIndex] = useState(0)
  const [studentInfo, setStudentInfo] = useState<StudentInfo>()
  const [courseOptions, setCourseOptions] = useState<CourseIdName[]>([])

  const handleStudentInfoFormSubmit = (studentInfo: StudentInfo) => {
    setSelectedFormIndex(selectedFormIndex + 1)
    setStudentInfo(studentInfo)
    getAllComputerScienceCoursesForUniversity(studentInfo.universityId).then(courses =>
      setCourseOptions(courses)
    )
  }

  const handleCoursesFormSubmit = async (coursesInfo: CoursesInfo) => {
    console.log("coursesInfo", coursesInfo)
    if (studentInfo === undefined) {
      throw Error("studentInfo is undefined")
    }
    const scheduleId = await createNewSchedule(
      userId,
      studentInfo.majors,
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
