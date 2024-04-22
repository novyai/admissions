interface ParsedTerm {
  year: number
  semester: "Spring" | "Summer" | "Fall"
}

export function parseCode(term: string): ParsedTerm {
  const split = term.toString().split(" ")
  const year = parseInt(split[0])
  const semester = split[1]

  return { year, semester: semester as ParsedTerm["semester"] }
}

// Mock function to get current year and semester
function getCurrentTerm(): ParsedTerm {
  const currentDate = new Date()
  const currentYear = currentDate.getFullYear()

  const month = currentDate.getMonth() + 1 // JavaScript months are 0-indexed
  console.log("month", month)

  let currentSemester: ParsedTerm["semester"]
  if (month >= 1 && month <= 5) currentSemester = "Spring" as const
  else if (month >= 6 && month <= 8) currentSemester = "Summer" as const
  else currentSemester = "Fall" as const

  return { year: currentYear, semester: currentSemester }
}

// Function to calculate difference in semesters
export function calculateSemesterDifference(fromTerm: string): number {
  const fromParsed = parseCode(fromTerm)
  const toParsed = getCurrentTerm()
  console.log(fromParsed, toParsed)
  const yearDifference = toParsed.year - fromParsed.year

  const mapping = {
    Fall: 1,
    Spring: 2,
    Summer: 0
  }

  const diff = yearDifference * 2 + (mapping[toParsed.semester] - mapping[fromParsed.semester])

  return diff
}

export function getSemesterCode(index: number, startDate: string): ParsedTerm {
  const parsed = parseCode(startDate)

  while (index > 0) {
    if (parsed.semester === "Fall") {
      parsed.semester = "Spring"
      parsed.year++
    } else {
      parsed.semester = "Fall"
    }
    index--
  }

  return parsed
}
