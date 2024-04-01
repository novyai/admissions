import { z } from "zod"
import { CORE_AGENT_ACTIONS } from "@repo/constants"
import { linesOfBusiness } from "@constants/defaults"

// export const modifyProposalParams = z.object({
//   action: z.literal(CORE_AGENT_ACTIONS.MODIFY_PROPOSAL),
//   changes: z.array(z.object({
//     type: z.string().describe("The type of element they want to add"),
//   })).describe("The changes to be made to the proposal")
// })

export const addElementParams = z.object({
  action: z.literal(CORE_AGENT_ACTIONS.ADD_ELEMENT),
  type: z.string(z.enum(["unknown", ...Object.values(linesOfBusiness)] as [string, ...string[]])).describe("the type (line of business) of the new element.").optional(),
})

export const removeElementParams = z.object({
  action: z.literal(CORE_AGENT_ACTIONS.ADD_ELEMENT),
  elementId: z.string().describe("the ID of the element the user wants to remove."),
})

const operations = ['add', 'remove']
export const modifyEngagementsParams = z.object({
  action: z.literal(CORE_AGENT_ACTIONS.MODIFY_ENGAGEMENTS),
  elementId: z.string().describe("the id of the element to modify"),
  changes: z.array(z.object({
    level: z.string().describe("the level of the person in this engagement. Only populate this when adding an engagement.").optional(),
    operation: z.string(z.enum([...Object.values(operations)] as [string, ...string[]])).describe("the type of change the user is asking for").optional(),
    engagementId: z.string().describe("the id of the engagement to modify").optional(),
  })).describe("The changes to be made to the engagements")
})

export const editElementParams = z.object({
  action: z.literal(CORE_AGENT_ACTIONS.EDIT_ELEMENT),
  elementId: z.string().describe("the id of the element to modify"),
  name: z.string().describe("the new name of the element").optional(),
  type: z.string().describe("the new type of the element").optional(),
})

const scopeChangeTargets = z.enum(["element", "engagement"])
const scopeChangeType = z.enum(["totalWeeks", "hoursPerWeek"])
export const changeHoursParams = z.object({
  action: z.literal(CORE_AGENT_ACTIONS.CHANGE_TIME),
  changes: z.array(z.object({
    targetType: z.string(z.enum([...Object.values(scopeChangeTargets)] as [string, ...string[]])).describe("What is the target of the change? Element or Engagement. If the user is talking about specific people or roles, they're talking about engagements."),
    timeType: z.string(z.enum([...Object.values(scopeChangeType)] as [string, ...string[]])).describe("what part of the proposal are we trying to change."),
    id: z.string().describe("the id of the element or engagement to change. If targetType is element, this is the element id. If targetType is engagement, this is the engagement id."),
    value: z.number().describe("the new number of hours to set."),
  })).describe("The changes to be made"),
})

// export const unknownCommandParams = z.object({
//   action: z.literal(CORE_AGENT_ACTIONS.UNKNOWN_COMMAND),
//   message: z.string().describe("The message to be sent to the user"),
// })

// export const sendMessageToUserParams = z.object({
//   action: z.literal(CORE_AGENT_ACTIONS.SEND_MESSAGE_TO_USER),
//   message: z.string().describe("The message to be sent to the user"),
//   needsResponse: z.boolean().describe("Whether or not the user needs to respond to the message"),
// })

const ActionPayload = z.discriminatedUnion("action", [
  addElementParams,
  changeHoursParams,
  editElementParams,
  modifyEngagementsParams,
  // unknownCommandParams,
  // sendMessageToUserParams,
])

export const commandAgentSchema = z.object({
  action: z.string(z.enum([...Object.values(CORE_AGENT_ACTIONS)] as [string, ...string[]])).describe(`an action for the agent to take in response to the user command. Must be one of ${Object.keys(CORE_AGENT_ACTIONS)}`).optional(),
  actionParams: ActionPayload.optional().describe("Parameters for the action call, structured based on the action type. Pay very close attention to these details."),
})