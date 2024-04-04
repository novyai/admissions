export const SUMMARIZE_TOKEN_THRESHOLD = 1500
export const MAX_TOKEN_COUNT_PER_COMPLETION = 5000
export const HEARTBEAT_INTERVAL = 30000

export const CORE_AGENT_ACTIONS = {
  DO_THING: "DO_THING"
}

export const SOCKET_EVENTS = {
  CONVERSATION_STREAM: "CONVERSATION_STREAM",
  START_CONVERSATION_STREAM: "START_CONVERSATION_STREAM",
  COMPLETE_CONVERSATION_STREAM: "COMPLETE_CONVERSATION_STREAM"
} as const

export type ConversationStreamData = {
  data: {
    data: unknown
    streamId: string
    userId: string
    complete?: boolean
    messageStreamIndex: number
  }
  type: typeof SOCKET_EVENTS.CONVERSATION_STREAM
}

export type GenericListener = (data?: unknown) => void
export type ConversationStreamListener = (data: ConversationStreamData["data"]) => void

export type SocketListeners = {
  [SOCKET_EVENTS.CONVERSATION_STREAM]?: ConversationStreamListener
  [SOCKET_EVENTS.START_CONVERSATION_STREAM]?: GenericListener
  [SOCKET_EVENTS.COMPLETE_CONVERSATION_STREAM]?: GenericListener
}

export type EventDataTypes = {
  [SOCKET_EVENTS.CONVERSATION_STREAM]: ConversationStreamData["data"]
  [SOCKET_EVENTS.START_CONVERSATION_STREAM]: undefined
  [SOCKET_EVENTS.COMPLETE_CONVERSATION_STREAM]: undefined
}

export interface SocketMsg<T extends keyof typeof SOCKET_EVENTS> {
  type: T
  data: EventDataTypes[T]
}

interface ActionDefinitions {
  [key: string]: {
    actionType: string
    description: string
    narrative: string
    sideEffect: boolean
  }
}

export const CORE_AGENT_ACTION_DEFINITIONS: ActionDefinitions = {
  [CORE_AGENT_ACTIONS.DO_THING]: {
    actionType: CORE_AGENT_ACTIONS.DO_THING,
    description: `does a thing./..`,
    narrative: "When a user does x, u should do a thing...",
    sideEffect: true
  }
} as const
