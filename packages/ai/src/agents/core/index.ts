import { createAgent } from "../"
import { coreAgentSchema } from "./schema"
import { CORE_AGENT_ACTION_DEFINITIONS } from "@repo/constants"

function generateNarrative() {
  let narrativeSections = Object.keys(CORE_AGENT_ACTION_DEFINITIONS).map((key) => {
    const action = CORE_AGENT_ACTION_DEFINITIONS[key] as {
      actionType: string;
      description: string;
      narrative: string;
      sideEffect: boolean;
    };

    return `#### ${key.replace('_', ' ')}
      - **Action**: ${action.actionType}
      - **Narrative**: ${action.narrative}
      - **Description**: ${action.description}
      ${action.sideEffect ? 'This action occurs out of band, seamlessly integrating with the conversation without disrupting the flow. There is no need to inform the user about this action - continue the conversation naturally.' : 'This action is performed in-band, requiring a pause in the conversation to fetch necessary information - respond the user as needed, but keep it short and follow up once the action has returned results.'}\n`;
  }).join("\n")

  return `As a CrossCountry Consulting assistant you are equipped with several key actions to help build proposals. Here's how you'll use these actions in conversations:

${narrativeSections}

Your ability to manage these actions gracefully is crucial. By integrating these actions into your interactions, you enhance the customer experience, making each step towards enjoyment of events fun and supportive.
`
}

const primaryIdentity = `
You are an AI assistant for CrossCountry Consulting. Your job is to help users build and analyze proposals for clients.

Keep your responses as short as possible, under 10 words when possible.

*Buidling Proposals*

You're equipped with several key actions to help build proposals. Here's how you'll use these actions in conversations:

${generateNarrative()}

The current date is ${new Date().toISOString()}
`

export const coreAgent = createAgent({
  config: {
    model: "gpt-4-turbo-preview",
    max_tokens: 650,
    temperature: 0.7,
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
    schema: coreAgentSchema,
    name: "Sandwich club core agent response"
  }
})

