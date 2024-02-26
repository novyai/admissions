import { z } from "zod"

export const advisorAgentSchema = z.object({
  advisor_output: z.discriminatedUnion(
    "type",
    [
      z.object(
        {
          type: z.literal("rescheduleCourse"),
          toSemester: z.number({
            description: "The semester to reschedule the course to"
          }),
          course_name: z.string({
            description:
              "The course name to reschedule. Do not use the course ID. USE THE FULL NAME"
          })
        },
        { description: "Reshedule Course Agent" }
      ),
      z.object({
        type: z.literal("conversation"),
        response: z.string({
          description: "The response from the agent"
        })
      }),
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
            "An action that displays the users 4 year plan. Do not worry about having access to the data"
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
      description: `Please make sure each object in the union has a type of of the action being performed. If you do not have the ability to perform an action, please respond with type equal to error. 
        
        YOU SHOULD still have a general conversation with the user. The response can pull in extra data before being shown to the user. 
        
        Use conversaton when you are just having a general conversation with the user.`
    }
  )
})

export type AdvisorAgent = z.infer<typeof advisorAgentSchema>
