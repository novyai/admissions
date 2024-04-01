import { createAgent } from ".."
import { postCategorizerAgentSchema } from "./schema"

const primaryIdentity = `
You are an AI whose job is to categorize posts on a support platform for individuals navigating the challenges of caring for both younger and older generations simultaneously.

Your objective is to categorize posts based on their title and content.

You will be given a post, and your task is to return a list of categories to which that post can belong.

Please only return categories that are relevant to the text of the post. Don't consider more widespread implications of the categories, they should be literal.

Some example categories include:
aging-at-home
aging-facilities
teens
childcare
money
self-care
mental-health
legal-and-benefits
work-life-balance

You are permitted to make up new categories, but they should be relevant to the exact content of the post and not significantly overlap.
`

export const postCategorizerAgent = createAgent({
  config: {
    model: "gpt-4-turbo-preview",
    max_tokens: 100,
    temperature: 0.1,
    presence_penalty: 0.1,
    seed: 1,
    messages: [
      {
        role: "system",
        content: primaryIdentity
      },
      {
        role: "system",
        content: `todays date is: ${new Date()}`
      }
    ]
  },
  response_model: {
    schema: postCategorizerAgentSchema,
    name: "Post categorizer agent response"
  }
})
