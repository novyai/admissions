// import { oai } from "@ai/lib/oai"
// import Instructor from "@instructor-ai/instructor"
// import OpenAI from "openai"
// import { commandAgentSchema } from "./schema"

// import { Proposal } from "@db/client"
// import { CORE_AGENT_ACTION_DEFINITIONS } from "@repo/constants"
// import { allTitles, costRatesByTitle, LocationCostRates } from "@constants/defaults"
// import { getPersonById } from "@db/queries/person"
// import { ProposalData } from "@constants/index"

// function generateNarrative() {
//   let narrativeSections = Object.keys(CORE_AGENT_ACTION_DEFINITIONS).map((key) => {
//     const action = CORE_AGENT_ACTION_DEFINITIONS[key] as {
//       actionType: string;
//       description: string;
//       narrative: string;
//       sideEffect: boolean;
//     };

//     return `#### ${key.replace('_', ' ')}
//       - **Action**: "${action.actionType}"
//       - **Narrative**: ${action.narrative}
//       - **Description**: ${action.description}`;
//   }).join("\n")

//   return `You are equipped with several key actions to use (${Object.keys(CORE_AGENT_ACTION_DEFINITIONS).join(', ')}):
// ${narrativeSections}

// Your ability to manage these actions gracefully is crucial. By integrating these actions into your interactions, you enhance the customer experience, making each step towards enjoyment of events fun and supportive.
// `
// }

// const primaryIdentity = `
// You are a proposal builder assistant. Users will type commands into their interface and your job is to interpret their command into specific actions.

// Proposals are the top level object in the system. They contain elements, which are the main building blocks of the proposal. Each element has engagements, which links to people and their roles within an element of the proposal.

// When adding or removing people from an element of a proposal, you're adding or removing engagements.

// Employees are referred to as people in the system. People have different "levels" based on their position in the company. The list of possible levels is: ${allTitles.join(', ')}

// If a user talks about adding people to elements, they're talking about adding engagements.

// Here are the actions you can take, you can not take any actions that aren't in this list:
// ${generateNarrative()}

// You must always use one of the following actions: ${Object.keys(CORE_AGENT_ACTION_DEFINITIONS).join(', ')}. Any other value will break the application. When you're not sure what to use, default to the UNKNOWN_COMMAND action.

// When invoking an action, only concern yourself with the given parameters. The system has many defaults that will be used when less information is provided by the user.

// Today's date is ${new Date().toISOString()}
// `

// console.log("PRIMARY IDENTITY", primaryIdentity)

// function getProposalData(proposal: Proposal): ProposalData {
//   if (
//     proposal.data &&
//     typeof proposal.data === "object" &&
//     !Array.isArray(proposal.data) &&
//     "elements" in proposal.data
//   ) {
//     // Casting to go between prisma json and typescript interface
//     return proposal.data as unknown as ProposalData
//   }

//   return {
//     elements: []
//   }
// }

// export interface TargetItem {
//   id: string
//   type: string
//   path: string
//   title: string
// }

// export async function commandAgent({
//   command,
//   proposal,
//   targetItem
// }: {
//   command: string
//   proposal: Proposal
//   targetItem: TargetItem
// }) {
//   const client = Instructor({
//     client: oai,
//     mode: "TOOLS"
//   })

//   let proposalText = ""

//   const proposalData = getProposalData(proposal)
//   for (let element of (proposalData.elements || [])) {
//     let elementText = `  Element: ${element.name} (id: ${element.id})\n`
//     for (let engagement of element.engagements) {
//       const person = engagement.person || await getPersonById({ id: engagement.personId })
//       if (!person) {
//         console.log("ENGAGEMENT MISSING PERSON", engagement.id, person)
//         continue
//       }

//       const location = (person.location || "NA") as "NA" | "SA"
//       const levelIndex = allTitles.indexOf(person.level)
//       const locationRates = costRatesByTitle as LocationCostRates
//       const elementTypeRates = locationRates[location][element.type]

//       if (!elementTypeRates) {
//         throw new Error(`No element rates found for ${element.type} in ${location}`)
//       }

//       const cost = elementTypeRates[levelIndex]
//       let engagementText = "    Engagement: \n"
//       engagementText += `      id: ${engagement.id}\n`
//       engagementText += `      Time:\n`
//       engagementText += `        hoursPerWeek: ${engagement.hoursPerWeek}\n`
//       engagementText += `        totalWeeks: ${engagement.totalWeeks}\n`
//       engagementText += `      Person: ${person?.id}\n`
//       engagementText += `        name: ${person?.name}\n`
//       engagementText += `        level: ${person?.level}\n`
//       engagementText += `        location: ${person?.location || "NA"}\n`
//       engagementText += `        cost: ${cost}\n`
//       elementText += engagementText + "\n"
//     }

//     proposalText += elementText
//   }

//   const contextMessage = `
//     The current proposal is:
//     ${proposalText}
//   `

//   console.log("CONTEXT MESSAGE IS", contextMessage)

//   const targetMessage = targetItem ? `The user has indicated that their focus is:
//     - id: ${targetItem.id}
//     - type: ${targetItem.type}
//     - path: ${targetItem.path}
//     - title: ${targetItem.title}
//   ` : ""

//   const commandMessage = `
//     The user's command is: "${command}"

//     ${targetMessage}
    
//     You must take one of the following actions: ${Object.keys(CORE_AGENT_ACTION_DEFINITIONS).join(', ')}`

//   const messages = [
//     {
//       role: "system",
//       content: contextMessage
//     } as OpenAI.ChatCompletionMessageParam,
//     {
//       role: "system",
//       content: commandMessage
//     } as OpenAI.ChatCompletionMessageParam
//   ]

//   console.log("COMMAND AGENT MESSAGES", messages)

//   const results = await client.chat.completions.create({
//     response_model: {
//       schema: commandAgentSchema,
//       name: "Action to take based on user command."
//     },
//     messages: [
//       {
//         role: "system",
//         content: primaryIdentity
//       },
//       ...messages
//     ],
//     model: "gpt-4-turbo-preview"
//   })

//   console.log("RESULTS", results)

//   return results
// }
