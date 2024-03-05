interface ParsedTerm {
	year: number
	semester: string
}

export function parseTermCode(term: number | string): ParsedTerm {
	const year = parseInt(term.toString().substring(0, 4), 10)
	const month = parseInt(term.toString().substring(4), 10)

	let semester = ""
	if (month >= 1 && month <= 5) semester = "Spring"
	else if (month >= 6 && month <= 8) semester = "Summer"
	else if (month >= 9 && month <= 12) semester = "Fall"

	return { year, semester }
}
