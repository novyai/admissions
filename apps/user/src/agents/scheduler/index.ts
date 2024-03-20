export const generatePrimaryIdentity = (
  electives: {
    courseSubject: string
    courseNumber: string
    name: string
  }[]
): string => `
  You are an agent whose goal is to extract elective courses from a question.
  
  Here are a list of electives: 
  ${electives.map(elective => `- ${elective.courseSubject} ${elective.courseNumber}: ${elective.name}`).join("\n")}
`
