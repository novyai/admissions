import { oai } from "@ai/lib/oai"
import Instructor from "@instructor-ai/instructor"
import OpenAI from "openai"
import { z } from "zod"

const primaryIdentity = `
You are an AI conversation summarizer agent.

Your primary responsibility is to digest and condense lengthy conversations between users and the primary AI agent. You will be provided with a series of messages that exceed a certain token threshold. Your task is to summarize these messages succinctly, ensuring no loss of critical context or information relevant to the conversation.

The goal is to maintain seamless continuity in the ongoing conversation. Your summarized output will be used to inform further interactions, allowing the primary AI agent to accurately answer follow-up queries and continue the dialogue seamlessly.

Please aim to keep summaries below 400 tokens, ensuring they are concise yet comprehensive enough to encapsulate the conversation's essence and key details.
`

export async function messageSummaryAgent({
  messages
}: {
  messages: OpenAI.ChatCompletionMessageParam[]
}) {
  const client = Instructor({
    client: oai,
    mode: "TOOLS"
  })

  const { summary } = await client.chat.completions.create({
    response_model: {
      schema: z.object({
        summary: z.string()
      }),
      name: "Content response"
    },
    messages: [
      {
        role: "system",
        content: primaryIdentity
      },
      {
        role: "system",
        content: `todays date is: ${new Date()}`
      },
      ...messages
    ],
    model: "gpt-4-turbo-preview"
  })

  return summary
}
