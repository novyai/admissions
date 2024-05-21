import { Semester, SemesterYearType } from "@graph/types"

function getCurrentTerm(): SemesterYearType {
  const currentDate = new Date()
  const currentYear = currentDate.getFullYear()

  const month = currentDate.getMonth() + 1 // JavaScript months are 0-indexed

  let currentSemester: Semester
  if (month >= 1 && month <= 5) currentSemester = "SPRING"
  else if (month >= 6 && month <= 8) currentSemester = "SUMMER"
  else currentSemester = "FALL"

  return { year: currentYear, semester: currentSemester }
}

// Function to calculate difference in semesters
export function calculateSemesterDifference(startTerm: SemesterYearType): number {
  const currentTerm = getCurrentTerm()
  const yearDifference = currentTerm.year - startTerm.year

  const mapping: { [semester in Semester]: number } = {
    FALL: 1,
    SPRING: 2,
    SUMMER: 0
  }

  const diffOffset = mapping[currentTerm.semester] - mapping[startTerm.semester]

  const diff = yearDifference * 2 + 1 - diffOffset

  return diff
}

export function getSemesterCode(index: number, startTerm: SemesterYearType): SemesterYearType {
  let { semester, year } = startTerm
  while (index > 0) {
    if (semester === "FALL") {
      semester = "SPRING"
      year++
    } else {
      semester = "FALL"
    }
    index--
  }

  return { semester, year }
}
