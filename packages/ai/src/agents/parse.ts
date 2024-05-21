import { instructorOAI } from "@ai/lib/oai"
import { z } from "zod"

export const parseSchema = z.object({
  courseSubject: z.string(),
  courseNumber: z.string(),
  name: z.string(),
  creditHours: z.string(),
  description: z.string(),
  conditions: z
    .array(
      z.object({
        logicalOperator: z.enum(["AND", "OR"]),
        conditions: z.array(
          z.object({
            type: z.enum(["COREQUISITE", "PREREQUISITE"]),
            minimumGrade: z.string().optional(),
            prerequisites: z.array(
              z.object({ courseSubject: z.string(), courseNumber: z.string() })
            )
          })
        )
      })
    )
    .default([])
})

const requirement = `
Credit(s): 4
Vector algebra, vector-valued functions, and analytic geometry in space. Polar, cylindrical, and spherical coordinate systems. Quadric surfaces and functions of several variables, partial derivatives, and optimization problems. Multiple integrals and applications to engineering and the sciences. Line Integrals if time permits.

Course Attribute(s): 6AM - State Computation Requirement, 6AMM - State Computation Requirement, 6AMT - Gordon Computation Requirement, 6AMT - State Computation Requirement

Prerequisite(s): MAC 2282 or MAC 2312 with a grade of C or better
`

const completion = await instructorOAI.chat.completions.create({
  messages: [
    {
      role: "system",
      content: `Parse the course into the schema
      
      INPUT: 

      MAC 2312 - CALCULUS II
      Credit(s): 4
      Antiderivatives, the definite integral, applications, series, log, exponential and trig functions.

      Course Attribute(s): 6AM - State Computation Requirement, 6AMM - State Computation Requirement, 6AMP - State Computation Requirement, 6AMT - Gordon Computation Requirement, 6AMT - State Computation Requirement, CAMA - Mathematics

      Prerequisite(s): C or better in MAC 2311 or MAC 2281.
      Other Information: No credit for students with credit in MAC 2242 or MAC 2282.

      Result
      {
        "courseSubject": "MAC",
        "courseNumber": "2312",
        "name": "Calculus II",
        "creditHours": "4",
        "description": "Antiderivatives, the definite integral, applications, series, log, exponential and trig functions.",
        "conditions": [
          {
            "logicalOperator": "OR",
            "conditions": [
              {
                "type": "PREREQUISITE",
                "minimumGrade": "C",
                "prerequisites": [
                  {
                    "courseSubject": "MAC",
                    "courseNumber": "2281"
                  }
                ]
              },
              {
                "type": "PREREQUISITE",
                "minimumGrade": "C",
                "prerequisites": [
                  {
                    "courseSubject": "MAC",
                    "courseNumber": "2311"
                  }
                ]
              }
            ]
          }
        ]
      },
      
      `
    },
    {
      role: "user",
      content: `parse the following requirement into a schema with its attributes and values
      
      Ignore course attributes and other information
      If there are no prerequisites or corequisites, do not include the conditions array

      Prerequisites and Corequisites should be AND together if in separate sections
      ${requirement}
      `
    }
  ],
  model: "gpt-3.5-turbo",
  temperature: 0.3,
  response_model: {
    name: "Requirement Parser",
    schema: parseSchema
  },
  max_retries: 3
})

function omit<Data extends object, Keys extends keyof Data>(
  data: Data,
  keys: Keys[]
): Omit<Data, Keys> {
  const result = { ...data }

  for (const key of keys) {
    delete result[key]
  }

  return result as Omit<Data, Keys>
}
console.log(requirement)
console.log(JSON.stringify(omit(completion, ["_meta"]), null, 2))
