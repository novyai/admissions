import { createAgent } from "@ai/agents"

import { additionalCoursesSchema } from "./schema"

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

export const addCourseAgent = createAgent({
  config: {
    messages: [],
    model: "gpt-4-turbo-preview",
    temperature: 0.5,
    max_tokens: 1000,
    stream: false
  },
  response_model: {
    schema: additionalCoursesSchema,
    name: "Reschedule Course Agent"
  }
})
