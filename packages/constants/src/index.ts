export const SUMMARIZE_TOKEN_THRESHOLD = 1500
export const MAX_TOKEN_COUNT_PER_COMPLETION = 5000
export const HEARTBEAT_INTERVAL = 30000

export const CORE_AGENT_ACTIONS = {
  RESCHEDULE_COURSE: "RESCHEDULE_COURSE",
  FORCE_RESCHEDULE_COURSE: "FORCE_RESCHEDULE_COURSE",
  // BOOK_APPOINTMENT: "BOOK_APPOINTMENT",
  GIVE_REQUIREMENTS_FULFILLED_BY_COURSE: "GIVE_REQUIREMENTS_FULFILLED_BY_COURSE",
  GIVE_COURSE_ALTERNATIVES: "GIVE_COURSE_ALTERNATIVES",
  SHOW_APPOINTMENT: "SHOW_APPOINTMENT",
  DO_THING: "DO_THING"
}

export const SOCKET_EVENTS = {
  CONVERSATION_STREAM: "CONVERSATION_STREAM",
  START_CONVERSATION_STREAM: "START_CONVERSATION_STREAM",
  COMPLETE_CONVERSATION_STREAM: "COMPLETE_CONVERSATION_STREAM",
  NEW_VERSION: "NEW_VERSION",
  SHOW_APPOINTMENT: "SHOW_APPOINTMENT",
  SCROLL_TO_REQUIREMENT_IN_AUDIT: "SCROLL_TO_REQUIREMENT_IN_AUDIT",
  SWITCH_BETWEEN_SCHEDULE_AUDIT_TABS: "SWITCH_BETWEEN_SCHEDULE_AUDIT_TABS"
} as const

export type ConversationStreamData = {
  data: {
    data: {
      content: string
      action?: string
      actionParams?: unknown
    }
    streamId: string
    userId: string
    complete?: boolean
    messageStreamIndex: number
  }
  type: typeof SOCKET_EVENTS.CONVERSATION_STREAM
}

export enum ChangeType {
  Move = "move"
}

export type Change = {
  type: ChangeType.Move
  courseId: string
  semester: number
}

export type ShowAppointmentData = {
  data: undefined
  type: typeof SOCKET_EVENTS.SHOW_APPOINTMENT
}

export type NewVersionData = {
  data: {
    versionId: string
    changes: Change[]
  }
  type: typeof SOCKET_EVENTS.NEW_VERSION
}

export type ScrollToRequirementData = {
  data: {
    requirementGroupOrSubgroupId: string
  }
  type: typeof SOCKET_EVENTS.SCROLL_TO_REQUIREMENT_IN_AUDIT
}

export type SwitchBetweenScheduleAuditTabsData = {
  data: {
    tab: "schedule" | "audit"
  }
  type: typeof SOCKET_EVENTS.SWITCH_BETWEEN_SCHEDULE_AUDIT_TABS
}

export type GenericListener = (data?: unknown) => void
export type ConversationStreamListener = (data: ConversationStreamData["data"]) => void
export type NewVersionListener = (data: NewVersionData["data"]) => void
export type ShowAppointmentListener = (data: ShowAppointmentData["data"]) => void
export type ScrollToRequirementListener = (data: ScrollToRequirementData["data"]) => void
export type SwitchBetweenScheduleAuditTabsListener = (
  data: SwitchBetweenScheduleAuditTabsData["data"]
) => void

export type SocketListeners = {
  [SOCKET_EVENTS.CONVERSATION_STREAM]?: ConversationStreamListener
  [SOCKET_EVENTS.START_CONVERSATION_STREAM]?: GenericListener
  [SOCKET_EVENTS.COMPLETE_CONVERSATION_STREAM]?: GenericListener
  [SOCKET_EVENTS.NEW_VERSION]?: NewVersionListener
  [SOCKET_EVENTS.SHOW_APPOINTMENT]?: ShowAppointmentListener
  [SOCKET_EVENTS.SCROLL_TO_REQUIREMENT_IN_AUDIT]?: ScrollToRequirementListener
  [SOCKET_EVENTS.SWITCH_BETWEEN_SCHEDULE_AUDIT_TABS]?: SwitchBetweenScheduleAuditTabsListener
}

export type EventDataTypes = {
  [SOCKET_EVENTS.CONVERSATION_STREAM]: ConversationStreamData["data"]
  [SOCKET_EVENTS.START_CONVERSATION_STREAM]: undefined
  [SOCKET_EVENTS.COMPLETE_CONVERSATION_STREAM]: undefined
  [SOCKET_EVENTS.NEW_VERSION]: NewVersionData["data"]
  [SOCKET_EVENTS.SHOW_APPOINTMENT]: ShowAppointmentData["data"]
  [SOCKET_EVENTS.SCROLL_TO_REQUIREMENT_IN_AUDIT]: ScrollToRequirementData["data"]
  [SOCKET_EVENTS.SWITCH_BETWEEN_SCHEDULE_AUDIT_TABS]: SwitchBetweenScheduleAuditTabsData["data"]
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
  },
  [CORE_AGENT_ACTIONS.RESCHEDULE_COURSE]: {
    actionType: CORE_AGENT_ACTIONS.RESCHEDULE_COURSE,
    description:
      "Takes a courseName and attempts to reschedule a course, depending on the severity of the change.",
    narrative:
      "When the change is severe confirms with the student and offers to book an appointment with an advisor.",
    sideEffect: false
  },
  [CORE_AGENT_ACTIONS.FORCE_RESCHEDULE_COURSE]: {
    actionType: CORE_AGENT_ACTIONS.FORCE_RESCHEDULE_COURSE,
    description:
      "Takes a courseName and reschedules a course, regardless of the severity of the change.",
    narrative: "",
    sideEffect: false
  },
  [CORE_AGENT_ACTIONS.SHOW_APPOINTMENT]: {
    actionType: CORE_AGENT_ACTIONS.SHOW_APPOINTMENT,
    description: "Show available advisor appointments.",
    narrative: "",
    sideEffect: true
  },
  [CORE_AGENT_ACTIONS.GIVE_REQUIREMENTS_FULFILLED_BY_COURSE]: {
    actionType: CORE_AGENT_ACTIONS.GIVE_REQUIREMENTS_FULFILLED_BY_COURSE,
    description: "Gives the requirements that are fulfilled by a course",
    narrative: "",
    sideEffect: false
  },
  [CORE_AGENT_ACTIONS.GIVE_COURSE_ALTERNATIVES]: {
    actionType: CORE_AGENT_ACTIONS.GIVE_COURSE_ALTERNATIVES,
    description: "Gives courses that the student can take as alternative to the given course.",
    narrative: "",
    sideEffect: false
  }
  // [CORE_AGENT_ACTIONS.BOOK_APPOINTMENT]: {
  //   actionType: CORE_AGENT_ACTIONS.BOOK_APPOINTMENT,
  //   description: "",
  //   narrative: "",
  //   sideEffect: false
  // }
} as const
