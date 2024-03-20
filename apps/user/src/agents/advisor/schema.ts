import { z } from "zod"

const actionSchema = z.discriminatedUnion(
  "type",
  [
    z.object(
      {
        type: z.literal("rescheduleCourse"),
        toSemester: z.number({
          description: "The semester to reschedule the course to"
        }),
        course_name: z.string({
          description: "The course name to reschedule. Do not use the course ID. USE THE FULL NAME"
        })
      },
      { description: "Reschedule Course Agent" }
    ),
    z.object(
      {
        type: z.literal("error"),
        error: z.string({
          description: "The error message from the agent"
        })
      },
      { description: "The action we do not have the ability to process yet" }
    ),
    z.object(
      {
        type: z.literal("4-year-plan")
      },
      {
        description:
          "An action that displays the users 4 year plan. Do not worry about having access to the data. ONLY USE IF THEY ASK FOR A 4 year plan"
      }
    ),
    z.object(
      {
        type: z.literal("display-course"),
        course_name: z.string({
          description: "The name of the course to display. Put the actual name not the code"
        })
      },
      {
        description:
          "An action that displays a singular course. Do not worry about having access to the data"
      }
    ),
    z.object(
      {
        type: z.literal("display-semester"),
        semester: z.number({
          description: "The semester to display"
        })
      },
      {
        description:
          "An action that displays a singular semester. Do not worry about having access to the data"
      }
    )
  ],
  {
    description: `Please make sure each object in the union has a type of of the action being performed. If you do not have the ability to perform an action, please respond with type equal to error. `
  }
)

const suggestedResponsesSchema = z
  .array(z.string())
  .describe(
    "Short and concise suggested responses or follow-up questions for the user to ask the assistant."
  )
  .min(0)
  .max(3)

export const advisorAgentSchema = z.object({
  advisor_output: z.object({
    response: z.string({
      description:
        "The text response from the agent. You should use actions instead of listing out courses. "
    }),
    actions: z
      .array(actionSchema, {
        description:
          "The actions the agent can perform. If you are just conversing, this will be an empty array."
      })
      .min(0)
      .max(2),
    suggestedResponses: suggestedResponsesSchema
  })
})

export type AdvisorAgent = z.infer<typeof advisorAgentSchema>
