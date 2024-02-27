import { primaryIdentity } from "@/agents/advisor"
import { advisorAgentSchema } from "@/agents/advisor/schema"
import OpenAI from "openai"
import { OAIStream, withResponseModel } from "zod-stream"

import { oai } from "@/lib/oai"

export const runtime = "edge"

export async function POST(request: Request): Promise<Response> {
  const {
    messages
    // prompt
  }: {
    messages: OpenAI.ChatCompletionCreateParams["messages"]
    prompt: string
  } = await request.json()

  try {
    const params = withResponseModel({
      response_model: {
        schema: advisorAgentSchema,
        name: "Reschedule Course Agent"
      },
      params: {
        messages: [
          {
            role: "system",
            content: primaryIdentity
          },
          ...messages
        ],
        model: "gpt-4"
      },
      mode: "TOOLS"
    })

    // make a completion call with your generated params
    const extractionStream = await oai.chat.completions.create({
      ...params,
      stream: true
    })

    const my_stream = OAIStream({
      res: extractionStream
    })
    return new Response(my_stream)
  } catch (error) {
    console.error(error)
    return new Response("Could not complete chat request.", {
      status: 500
    })
  }
}
