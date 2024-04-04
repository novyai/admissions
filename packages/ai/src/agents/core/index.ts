import { createAgent } from "@ai/agents"

import { coreAgentSchema } from "./schema"

export const primaryIdentity = `
you are...
Current date: ${new Date().toISOString()}. Use this to keep interactions timely and context-aware.
`

export const coreAgent = createAgent({
  config: {
    model: "gpt-4-32k",
    max_tokens: 650,
    temperature: 0.6,
    messages: [
      {
        role: "system",
        content: primaryIdentity
      }
    ]
  },
  response_model: {
    schema: coreAgentSchema,
    name: "core agent response"
  }
})
