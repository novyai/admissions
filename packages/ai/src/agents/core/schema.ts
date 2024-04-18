import z from "zod"

import { CORE_AGENT_ACTIONS } from "@repo/constants"

export const rescheduleCourseParams = z.object({
  action: z.literal(CORE_AGENT_ACTIONS.RESCHEDULE_COURSE),
  courseName: z.string().describe("The course to reschedule.")
})

export const forceRescheduleCourseParams = z.object({
  action: z.literal(CORE_AGENT_ACTIONS.FORCE_RESCHEDULE_COURSE),
  courseName: z.string().describe("The course to reschedule.")
})

export const doThingParams = z.object({
  action: z.literal(CORE_AGENT_ACTIONS.DO_THING),
  thing: z.string().describe("Do the thing")
})

// export const bookAppointmentParams = z.object({
//   action: z.literal(CORE_AGENT_ACTIONS.BOOK_APPOINTMENT),
//   time: z.string().describe("The appointment time.")
// })

export const showAppointmentParams = z.object({
  action: z.literal(CORE_AGENT_ACTIONS.SHOW_APPOINTMENT)
})

export const ActionPayload = z.discriminatedUnion("action", [
  rescheduleCourseParams,
  showAppointmentParams
])

export const coreAgentSchema = z.object({
  content: z
    .string()
    .describe(
      "The content of the agent's message to the user. This should never repeat the user's question back at them. It should be a response to their question, either answering it, or asking them to wait."
    ),
  action: z
    .enum([...Object.values(CORE_AGENT_ACTIONS)] as [string, ...string[]])
    .describe("an optional action for the agent to fire")
    .optional(),
  actionParams: ActionPayload.optional().describe(
    "Parameters for the action call, structured based on the action type. Pay very close attention to these details."
  )
})
