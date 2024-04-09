import { coreAgentSchema, doThingParams } from "@ai/agents/core/schema"
import { UnrecoverableError } from "bullmq"
import OpenAI from "openai"
import z from "zod"

import { coreAgent } from "@repo/ai/agents/core"
import { countTokens } from "@repo/ai/lib/tokens"
import { CORE_AGENT_ACTION_DEFINITIONS, CORE_AGENT_ACTIONS, SOCKET_EVENTS } from "@repo/constants"
import { ConversationSummary, Message, MessageRole, MessageType } from "@repo/db"
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
  : never
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
  prompt: z.string()
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

  async function publish({ data, type }: { data?: object; type: string }) {
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

  const actionHandlers = {
    [CORE_AGENT_ACTIONS.DO_THING]: async (params: z.infer<typeof doThingParams>) => {
      logger.info({
        message: "doing thing",
        conversationId: jobData.conversationId,
        userId: jobData.userId,
        data: params
      })

      return void 0 as void
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

      if (!completion?.action || !completion?.actionParams) {
        return complete()
      }

      const action = completion.action as keyof typeof CORE_AGENT_ACTIONS
      const actionParams = completion.actionParams as ActionParams[typeof action]
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
                content: `here are the results of action: ${agentStep.completion.action}: \n ${JSON.stringify(actionResults)} `,
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
        type: SOCKET_EVENTS.START_CONVERSATION_STREAM
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
            messageStreamIndex:
              isFollowUp ? jobData.messageStreamIndex + 1 : jobData.messageStreamIndex,
            data: final,
            complete: contentComplete
          }
        })

        if (
          !contentComplete &&
          completion._meta?._completedPaths?.some(path => path?.[0] === "content")
        ) {
          publish({
            type: SOCKET_EVENTS.COMPLETE_CONVERSATION_STREAM,
            data: {
              messageStreamIndex: jobData.messageStreamIndex
            }
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