import { createBlob, parseBlob } from "@graph/blob"
import { CourseGraph, getCourseAndSemesterIndexFromIdNameCode } from "@graph/course"
import { _hasDependents, graphToHydratedStudentProfile } from "@graph/graph"
import { createGraph, rescheduleCourse } from "@graph/profile"
import { getAlternativeCourseInfo, getRequirementsFulfilledByCourse } from "@graph/requirement"
import { CourseNode, HydratedStudentProfile } from "@graph/types"
import { UnrecoverableError } from "bullmq"
import OpenAI from "openai"
import z from "zod"

import { coreAgent } from "@repo/ai/agents/core"
import {
  coreAgentSchema,
  doThingParams,
  forceRescheduleCourseParams,
  giveCourseAlternatives,
  giveRequirementsFulfilledByCourse,
  rescheduleCourseParams,
  showAppointmentParams
} from "@repo/ai/agents/core/schema"
import { countTokens } from "@repo/ai/lib/tokens"
import {
  CORE_AGENT_ACTION_DEFINITIONS,
  CORE_AGENT_ACTIONS,
  SOCKET_EVENTS,
  SocketMsg
} from "@repo/constants"
import { ConversationSummary, db, Message, MessageRole, MessageType } from "@repo/db"
import {
  createMessages,
  getSummariesForConversation,
  getUnsummarizedMessagesForConversation
} from "@repo/db/queries/conversation"
import { logger } from "@/lib/logger"
import { getPreparedMessages } from "@/lib/messages"
import redis from "@/lib/redis"

import { createQueue } from "."
import { addChatSummaryJob } from "./chat-summary"

type ActionParams = {
  [K in (typeof CORE_AGENT_ACTIONS)[keyof typeof CORE_AGENT_ACTIONS]]: K extends (
    typeof CORE_AGENT_ACTIONS.DO_THING
  ) ?
    z.infer<typeof doThingParams>
  : K extends typeof CORE_AGENT_ACTIONS.DO_THING ? z.infer<typeof doThingParams>
  : K extends typeof CORE_AGENT_ACTIONS.RESCHEDULE_COURSE ? z.infer<typeof rescheduleCourseParams>
  : K extends typeof CORE_AGENT_ACTIONS.SHOW_APPOINTMENT ? z.infer<typeof showAppointmentParams>
  : // : K extends typeof CORE_AGENT_ACTIONS.BOOK_APPOINTMENT ? z.infer<typeof bookAppointmentParams>
    never
}

type ActionHandler<T extends keyof typeof CORE_AGENT_ACTIONS, P = unknown> = (
  params: ActionParams[keyof ActionParams & (typeof CORE_AGENT_ACTIONS)[T]]
) => Promise<P>

const chatStreamSchema = z.object({
  conversationId: z.string(),
  messageStreamIndex: z.number(),
  isInitialMessage: z.boolean().optional().default(false),
  userId: z.string(),
  meta: z.record(z.unknown()).default({}),
  streamId: z.string(),
  prompt: z.string(),
  versionId: z.string().nullable()
})

async function saveMessages({
  messages,
  conversationId,
  userId
}: {
  messages: Partial<Message>[]
  conversationId: string
  userId: string
}): Promise<Message[]> {
  try {
    const messagesWithTokenCount = messages.map(message => ({
      ...message,
      tokenCount: countTokens(message?.content ?? "")
    })) as {
      content: string
      role: MessageRole
      type: MessageType
      tokenCount: number
      userId: string
    }[]

    const newMessages = await createMessages({
      userId,
      messages: messagesWithTokenCount,
      conversationId
    })

    return newMessages
  } catch (e) {
    logger.error({
      message: "error saving message(s)",
      error: e,
      conversationId,
      userId
    })
    throw new UnrecoverableError("Unable to save messages")
  }
}

export const {
  add: addChatStreamJob,
  createJobStep,
  createWorker,
  q
} = createQueue("chat-stream", chatStreamSchema)

createWorker(async job => {
  const { data: jobData } = job

  const defaultMessageData = {
    messageStreamIndex: jobData.messageStreamIndex,
    streamId: jobData.streamId,
    userId: jobData.userId
  }

  async function publish<T extends keyof typeof SOCKET_EVENTS>({ data, type }: SocketMsg<T>) {
    redis.publish(
      jobData.streamId,
      JSON.stringify({
        data: {
          ...defaultMessageData,
          ...(data ?? {})
        },
        type
      })
    )
  }

  const hydrateSchedule = createJobStep<
    {
      versionId: string
    },
    {
      graph: CourseGraph
      profile: HydratedStudentProfile
      scheduleId: string
    }
  >("hydrate-schedule-step", async ({ complete }, { versionId }) => {
    const version = await db.version.findUnique({
      where: {
        id: versionId
      },
      select: {
        blob: true,
        scheduleId: true
      }
    })

    if (!version) {
      throw new Error(`Could not find version with id ${versionId}`)
    }

    const profile = parseBlob(version.blob)

    const { graph, courseToReqList } = await createGraph(profile)

    const hydratedProfile = graphToHydratedStudentProfile(graph, courseToReqList, profile)

    complete({
      graph: graph,
      profile: hydratedProfile,
      scheduleId: version.scheduleId
    })
  })

  const actionHandlers = {
    [CORE_AGENT_ACTIONS.DO_THING]: async (params: z.infer<typeof doThingParams>) => {
      logger.info({
        message: "doing thing",
        conversationId: jobData.conversationId,
        userId: jobData.userId,
        data: params
      })

      return void 0 as void
    },
    [CORE_AGENT_ACTIONS.SHOW_APPOINTMENT]: async (
      params: z.infer<typeof showAppointmentParams>
    ) => {
      logger.info({
        message: "showing appointments",
        conversationId: jobData.conversationId,
        userId: jobData.userId,
        data: params
      })
      await publish({
        type: SOCKET_EVENTS.SHOW_APPOINTMENT,
        data: undefined
      })
      return
    },
    [CORE_AGENT_ACTIONS.GIVE_COURSE_ALTERNATIVES]: async (
      params: z.infer<typeof giveCourseAlternatives>
    ) => {
      logger.info({
        message: "giving alternatives to course",
        conversationId: jobData.conversationId,
        userId: jobData.userId,
        data: params
      })
      if (!jobData.versionId) {
        throw new Error("No versionId found")
      }
      const { profile } = await hydrateSchedule.run({
        versionId: jobData.versionId
      })

      let courseSem: {
        course: CourseNode
        semesterIndex: number
      }
      try {
        courseSem = getCourseAndSemesterIndexFromIdNameCode(profile, params.courseName)
      } catch (error) {
        // Handle the case where the course is not found
        logger.error({
          message: "Course not found",
          error,
          conversationId: jobData.conversationId,
          userId: jobData.userId,
          courseQuery: params.courseName
        })
        // Return a custom message or handle as needed
        return `Course ${params.courseName} not found. Please check the course name and try again.`
      }
      const { course } = courseSem
      const { courseToReplace, alternativeCourses } = await getAlternativeCourseInfo(
        course.id,
        profile
      )

      let message = `
      # Metadata for the Course to Replace
      \`${JSON.stringify(courseToReplace)}\`

      # Metadata for the Alternative Courses
      \`${JSON.stringify(alternativeCourses)}\`

      `

      if (alternativeCourses.length === 0) {
        message += `Let the student know there are no alternative courses and provide context about which requirements the course fulfills.`
      } else {
        message += `If there are many alternatives, choose up the best alternatives by taking into account: 
         1) Whether the alternative course has the exact same credit hours as and fulfills the same requirements as the course to replace.
         2) Whether the prerequisites for the alternative course are already planned in the student's schedule.
 
        Start your message by summarizing your findings in 1-3 sentences. 

        As you list each alternative, instead of describing the course's topic, explain why it was chosen based on the criteria above, making sure to mention specific prerequisites.

        If there are more alternatives than what you listed, tell the student the total number of alternatives (${alternativeCourses.length}). 
        
        Let them know that they can find a full list of courses that fulfill the requirements (list the specific ones) on the degree audit page by expanding a requirement and looking for the "Other courses to consider" section.`
      }
      return message
    },
    [CORE_AGENT_ACTIONS.GIVE_REQUIREMENTS_FULFILLED_BY_COURSE]: async (
      params: z.infer<typeof giveRequirementsFulfilledByCourse>
    ) => {
      logger.info({
        message: "giving requirements fulfilled by course",
        conversationId: jobData.conversationId,
        userId: jobData.userId,
        data: params
      })
      if (!jobData.versionId) {
        throw new Error("No versionId found")
      }
      const { profile, graph } = await hydrateSchedule.run({
        versionId: jobData.versionId
      })

      let courseSem: {
        course: CourseNode
        semesterIndex: number
      }
      try {
        courseSem = getCourseAndSemesterIndexFromIdNameCode(profile, params.courseName)
      } catch (error) {
        // Handle the case where the course is not found
        logger.error({
          message: "Course not found",
          error,
          conversationId: jobData.conversationId,
          userId: jobData.userId,
          courseQuery: params.courseName
        })
        // Return a custom message or handle as needed
        return `Course ${params.courseName} not found. Please check the course name and try again.`
      }
      const { course } = courseSem
      if (profile.courseToReqList.has(course.id)) {
        const requirements = await getRequirementsFulfilledByCourse(course.id, profile)
        await publish({
          type: SOCKET_EVENTS.SCROLL_TO_REQUIREMENT_IN_AUDIT,
          data: { requirementGroupOrSubgroupId: requirements[0]!.requirementGroupOrSubgroup.id }
        })
        return `Course ${params.courseName} fulfills ${requirements.length} requirements: ${requirements.map(r => r.requirementGroupOrSubgroup.name)}`
      } else if (_hasDependents(course.id, graph)) {
        const directDependents = [...graph.outNeighborEntries(course.id)].map(
          node => node.attributes.name
        )
        return `Course ${params.courseName} is not a direct requirement in the program, but it is a prerequisite for ${directDependents}`
      } else {
        return `Course ${params.courseName} is not a requirement in the program.`
      }
    },
    [CORE_AGENT_ACTIONS.RESCHEDULE_COURSE]: async (
      params: z.infer<typeof rescheduleCourseParams>
    ) => {
      logger.info({
        message: "rescheduling course",
        conversationId: jobData.conversationId,
        userId: jobData.userId,
        data: params
      })
      if (!jobData.versionId) {
        throw new Error("No versionId found")
      }
      const { graph, profile, scheduleId } = await hydrateSchedule.run({
        versionId: jobData.versionId
      })

      let courseSem: {
        course: CourseNode
        semesterIndex: number
      }
      try {
        courseSem = getCourseAndSemesterIndexFromIdNameCode(profile, params.courseName)
      } catch (error) {
        // Handle the case where the course is not found
        logger.error({
          message: "Course not found",
          error,
          conversationId: jobData.conversationId,
          userId: jobData.userId,
          courseQuery: params.courseName
        })
        // Return a custom message or handle as needed
        return `Course ${params.courseName} not found. Please check the course name and try again.`
      }

      const { course, semesterIndex } = courseSem

      if (semesterIndex < profile.currentSemester) {
        return `Inform the student that they cannot reschedule the course because they already took it in their ${semesterIndex + 1}th semester. `
      }

      const {
        graph: newGraph,
        changes,
        profile: newProfile
      } = rescheduleCourse(graph, profile, course.id)

      const currentTimeToGraduate = profile.semesters.length
      const newTimeToGraduate = changes.reduce(
        (timeToGrad, change) => Math.max(timeToGrad, change.semester + 1),
        1
      )

      let systemPrompt = `
      This action made the following changes to your schedule:

      ${changes
        .map(
          change =>
            `- ${change.type} ${newGraph.getNodeAttribute(change.courseId, "name")} to ${change.semester + 1}`
        )
        .join("\n")}

        Please summarize these changes in your response in 1-4 bullet points. If there are any changes that affect the student's expected graduation time of ${currentTimeToGraduate}, please make sure to mention these changes in your summary.
    `

      if (newTimeToGraduate > currentTimeToGraduate) {
        systemPrompt = `
        Tell the student that the schedule change is serious because it delays their current graduation time of ${currentTimeToGraduate} semesters to ${newTimeToGraduate} semesters and requires rescheduling ${changes.length} courses. ALWAYS end your message asking whether the student would like to schedule an appointment OR reschedule the course anyway.
        `
        await publish({
          type: SOCKET_EVENTS.SHOW_APPOINTMENT,
          data: undefined
        })
      } else if (changes.length > 8) {
        systemPrompt = `
        Tell the student that this is a massive change to the student's schedule, and would require rescheduling ${changes.length} courses. ALWAYS end your message asking whether the student would like to schedule an appointment OR reschedule the course anyway.
      `
        await publish({
          type: SOCKET_EVENTS.SHOW_APPOINTMENT,
          data: undefined
        })
      } else {
        systemPrompt += `\n
          This is a fairly small change to your schedule.
          \n
        `

        const { id } = await db.version.create({
          data: {
            blob: createBlob(newProfile),
            scheduleId: scheduleId
          },
          select: {
            id: true
          }
        })

        logger.info({
          message: "new version created",
          conversationId: jobData.conversationId,
          userId: jobData.userId,
          versionId: jobData.versionId,
          data: {
            id
          }
        })

        await publish({
          type: SOCKET_EVENTS.NEW_VERSION,
          data: {
            versionId: id,
            changes
          }
        })
      }
      return systemPrompt
    },
    [CORE_AGENT_ACTIONS.FORCE_RESCHEDULE_COURSE]: async (
      params: z.infer<typeof forceRescheduleCourseParams>
    ) => {
      logger.info({
        message: "rescheduling course",
        conversationId: jobData.conversationId,
        userId: jobData.userId,
        data: params
      })
      if (!jobData.versionId) {
        throw new Error("No versionId found")
      }
      const { graph, profile, scheduleId } = await hydrateSchedule.run({
        versionId: jobData.versionId
      })

      let courseSem: {
        course: CourseNode
        semesterIndex: number
      }
      try {
        courseSem = getCourseAndSemesterIndexFromIdNameCode(profile, params.courseName)
      } catch (error) {
        // Handle the case where the course is not found
        logger.error({
          message: "Course not found",
          error,
          conversationId: jobData.conversationId,
          userId: jobData.userId,
          courseQuery: params.courseName
        })
        // Return a custom message or handle as needed
        return `Course ${params.courseName} not found. Please check the course name and try again.`
      }

      const { course, semesterIndex } = courseSem

      if (semesterIndex < profile.currentSemester) {
        return `Inform the student that they cannot reschedule the course because they already took it in their ${semesterIndex + 1}th semester. `
      }

      const {
        graph: newGraph,
        changes,
        profile: newProfile
      } = rescheduleCourse(graph, profile, course.id)

      const { id } = await db.version.create({
        data: {
          blob: createBlob(newProfile),
          scheduleId: scheduleId
        },
        select: {
          id: true
        }
      })

      logger.info({
        message: "new version created",
        conversationId: jobData.conversationId,
        userId: jobData.userId,
        versionId: jobData.versionId,
        data: {
          id
        }
      })

      const currentTimeToGraduate = profile.semesters.length

      let systemPrompt = `
      This action made the following changes to your schedule:

      ${changes
        .map(
          change =>
            `- ${change.type} ${newGraph.getNodeAttribute(change.courseId, "name")} to ${change.semester + 1}`
        )
        .join("\n")}

        Please summarize these changes in your response in 1-4 bullet points. If there are any changes that affect the student's expected graduation time of ${currentTimeToGraduate}, please make sure to mention these changes in your summary.

        End your message by emphasizing it's extremely important to meet with their advisor as soon as possible to dicuss the schedule changes.
    `

      await publish({
        type: SOCKET_EVENTS.NEW_VERSION,
        data: {
          versionId: id,
          changes
        }
      })
      await publish({
        type: SOCKET_EVENTS.SHOW_APPOINTMENT,
        data: undefined
      })
      return systemPrompt
    }
  }

  const getMessagesStep = createJobStep<
    void,
    {
      summaries: ConversationSummary[]
      unsummarizedMessages: Message[]
    }
  >("get-messages", async ({ complete, reject }) => {
    try {
      const [summaries, unsummarizedMessages] = await Promise.all([
        getSummariesForConversation({
          conversationId: jobData.conversationId,
          userId: jobData.userId
        }),
        getUnsummarizedMessagesForConversation({
          conversationId: jobData.conversationId,
          userId: jobData.userId
        })
      ])

      complete({ summaries, unsummarizedMessages })
    } catch (error) {
      logger.error({
        message: "Error fetching messages",
        error,
        conversationId: jobData.conversationId,
        userId: jobData.userId
      })

      reject(new UnrecoverableError("Unable to fetch messages"))
    }
  })

  const prepareMessagesStep = createJobStep<
    {
      summaries: ConversationSummary[]
      unsummarizedMessages: Message[]
    },
    OpenAI.ChatCompletionMessageParam[]
  >("prepare-messages", async ({ complete }, { summaries, unsummarizedMessages }) => {
    const preparedMessages = getPreparedMessages({
      conversationId: jobData.conversationId,
      summaries,
      unsummarizedMessages,
      ctxMessages: []
    }).map(message => ({
      content: message.content,
      role: message.role
    }))

    complete([...preparedMessages] as OpenAI.ChatCompletionMessageParam[])
  })

  const saveUserMessageStep = createJobStep<null, void | string>(
    "save-user-message",
    async ({ complete }) => {
      if (!jobData?.prompt?.length) {
        return complete()
      }

      const [userMessage] = await saveMessages({
        conversationId: jobData.conversationId,
        userId: jobData.userId,
        messages: [
          {
            content: jobData.prompt,
            role: "user"
          }
        ]
      })

      complete(userMessage?.id)
    }
  )

  const saveAssistantResponseStep = createJobStep<{ content: string }, string>(
    "save-assistant-response",
    async ({ complete, reject }, data) => {
      try {
        const [savedMessage] = await saveMessages({
          messages: [
            {
              content: data?.content,
              role: "assistant"
            }
          ],
          conversationId: jobData.conversationId,
          userId: jobData.userId
        })

        if (!savedMessage) {
          return reject(new UnrecoverableError("Unable to save messages"))
        }

        return complete(savedMessage.id)
      } catch (error) {
        logger.error({
          message: "Error saving assistant response",
          error,
          conversationId: jobData.conversationId,
          userId: jobData.userId
        })

        reject(new UnrecoverableError("Unable to save assistant response"))
      }
    }
  )

  const actionHandlerStep = createJobStep<z.infer<typeof coreAgentSchema>, void>(
    "action-handler-step",
    async ({ complete, reject }, completion) => {
      logger.info({
        message: "action handler step",
        conversationId: jobData.conversationId,
        userId: jobData.userId,
        action: completion.action,
        actionParams: completion.actionParams
      })

      if (!completion?.action) {
        return complete()
      }

      const action = completion.action as keyof typeof CORE_AGENT_ACTIONS
      const actionParams = completion.actionParams as unknown as ActionParams[typeof action]
      const actionHandler = actionHandlers[action] as ActionHandler<typeof action>

      const actionDef = CORE_AGENT_ACTION_DEFINITIONS[action]

      if (!actionHandler) {
        logger.error({
          message: "Action handler not found",
          conversationId: jobData.conversationId,
          userId: jobData.userId,
          data: {
            action,
            actionParams
          }
        })

        return complete()
      }

      try {
        const actionResults = await actionHandler(actionParams)
        if (!actionDef?.sideEffect) {
          const followUpCompletion = await coreAgentStep.run({
            messages: [
              ...messages,
              {
                role: "assistant",
                content: completion.content
              },
              {
                content: `here are the results of action: ${agentStep.completion.action}: \n 
                
                Please use the following information in your response
                ${actionResults}`,
                role: "system"
              }
            ],
            isFollowUp: true
          })

          logger.info({
            message: "action followup completion completed",
            conversationId: jobData.conversationId,
            userId: jobData.userId,
            completion: followUpCompletion
          })
        } else {
          logger.info({
            message: "action handler completed",
            conversationId: jobData.conversationId,
            userId: jobData.userId,
            action: completion.action,
            actionParams: completion.actionParams
          })
        }

        return complete()
      } catch (error) {
        logger.error({
          message: "Error running actions",
          error,
          conversationId: jobData.conversationId,
          userId: jobData.userId
        })

        reject(new UnrecoverableError("Unable to run action"))
      }
    }
  )

  const coreAgentStep = createJobStep<
    { messages: OpenAI.ChatCompletionMessageParam[]; isFollowUp?: boolean },
    {
      completion: z.infer<typeof coreAgentSchema>
    }
  >(
    "core-agent-step",
    async (
      { complete },
      {
        messages = [],
        isFollowUp = false
      }: { messages: OpenAI.ChatCompletionMessageParam[]; isFollowUp?: boolean } = { messages: [] }
    ) => {
      publish({
        type: SOCKET_EVENTS.START_CONVERSATION_STREAM,
        data: undefined
      })

      logger.info({
        message: "starting conversation stream",
        conversationId: jobData.conversationId,
        userId: jobData.userId,
        messages: messages
      })

      const stream = await coreAgent.completionStream({
        messages: messages
      })

      let final: Partial<z.infer<typeof coreAgentSchema>> = {}
      let contentComplete = false

      for await (const completion of stream) {
        final = completion

        await publish({
          type: SOCKET_EVENTS.CONVERSATION_STREAM,

          data: {
            streamId: jobData.streamId,
            userId: jobData.userId,
            messageStreamIndex:
              isFollowUp ? jobData.messageStreamIndex + 1 : jobData.messageStreamIndex,
            data: final as z.infer<typeof coreAgentSchema>,
            complete: contentComplete
          }
        })

        if (
          !contentComplete &&
          completion._meta?._completedPaths?.some(path => path?.[0] === "content")
        ) {
          publish({
            type: SOCKET_EVENTS.COMPLETE_CONVERSATION_STREAM,
            data: undefined
          })

          contentComplete = true
        }
      }

      await saveAssistantResponseStep.run({ content: final?.content ?? "" })

      return complete({
        completion: final as z.infer<typeof coreAgentSchema>
      })
    }
  )

  ///////

  const [_, conversationMessages] = await Promise.all([
    await saveUserMessageStep.run(),
    await getMessagesStep.run()
  ])

  const messages = await prepareMessagesStep.run({
    summaries: conversationMessages.summaries,
    unsummarizedMessages: conversationMessages.unsummarizedMessages
  })

  const agentStep = await coreAgentStep.run({
    messages
  })

  await actionHandlerStep.run(agentStep.completion)

  addChatSummaryJob(jobData.conversationId, {
    data: {
      conversationId: jobData.conversationId,
      userId: jobData.userId
    }
  })

  return agentStep
})
