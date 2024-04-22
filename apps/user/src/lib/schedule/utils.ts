interface ParsedTerm {
  year: number
  semester: "Spring" | "Summer" | "Fall"
}

export function parseCode(term: number | string): ParsedTerm {
  const split = term.toString().split(" ")
  const year = parseInt(split[1])
  const monthName = split[0]

  const monthMapping: Record<string, number> = {
    January: 0,
    February: 1,
    March: 2,
    April: 3,
    May: 4,
    June: 5,
    July: 6,
    August: 7,
    September: 8,
    October: 9,
    November: 10,
    December: 11
  }

  const month = monthMapping[monthName]

  let semester: ParsedTerm["semester"]
  if (month >= 1 && month <= 5) semester = "Spring" as const
  else if (month >= 6 && month <= 8) semester = "Summer" as const
  else semester = "Fall" as const

  return { year, semester }
}

// Mock function to get current year and semester
function getCurrentTerm(): ParsedTerm {
  const currentDate = new Date()
  const currentYear = currentDate.getFullYear()

  const month = currentDate.getMonth() + 1 // JavaScript months are 0-indexed

  let currentSemester: ParsedTerm["semester"]
  if (month >= 1 && month <= 5) currentSemester = "Spring" as const
  else if (month >= 6 && month <= 8) currentSemester = "Summer" as const
  else currentSemester = "Fall" as const

  return { year: currentYear, semester: currentSemester }
}

// Function to calculate difference in semesters
export function calculateSemesterDifference(fromTerm: number | string): number {
  const fromParsed = parseCode(fromTerm)
  const toParsed = getCurrentTerm()

  const yearDifference = toParsed.year - fromParsed.year
  let semesterDifference = 0

  // Assuming Spring = 1, Summer = 2, Fall = 3 for simplicity
  const semesterMapping = { Spring: 1, Summer: 2, Fall: 3 }
  semesterDifference =
    semesterMapping[toParsed.semester] - semesterMapping[fromParsed.semester] + yearDifference * 3

  return semesterDifference
}
