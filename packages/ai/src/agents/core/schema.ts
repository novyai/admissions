import { CORE_AGENT_ACTIONS } from "@repo/constants"
import { z } from "zod"

export const coreAgentSchema = z.object({
  action: z.string(z.enum([...Object.values(CORE_AGENT_ACTIONS)] as [string, ...string[]])).describe("an optional action for the agent to fire that will lead to the system fetching outside information that can be used to be respond to the user.").optional(),
  systemActions: z
    .array(z.enum(["SHORT_CIRCUIT"]))
    .describe("optional actions to be taken by the system."),
  promptTitle: z
    .string()
    .describe(
      "a title, based on the user's prompt - concise, descriptive  and in the form of a question."
    )
    .optional(),
  content: z
    .string()
    .describe(
      "A complete response to the user's query as a more generalized and detailed response that could be useful to others."
    ),
  mostRelevantResource: z
    .array(
      z.object({
        title: z.string(),
        url: z
          .string()
          .describe("a valid url from the semantic search results provided byt the system"),
        content: z.string()
      })
    )
    .min(0)
    .describe(
      "the most relevant resource to the user's query, extracted from the semantic search results that have been provided - only share valid urls and resourves that come from the results in 'payload.url'"
    ),
  threadTitle: z
    .string()
    .describe(
      "an updated title for the thread that the response is being added to - should be inclusive of the topics discussed in the conversation - concise descriptive, in the form of a queestion."
    ),
})
