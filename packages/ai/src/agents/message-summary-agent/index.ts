import { oai } from "@ai/lib/oai"
import Instructor from "@instructor-ai/instructor"
import OpenAI from "openai"
import { z } from "zod"

const primaryIdentity = `
You are an AI conversation summarizer
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
