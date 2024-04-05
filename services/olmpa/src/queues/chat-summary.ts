import { countTokens } from "@ai/lib/tokens"
import { UnrecoverableError } from "bullmq"
import OpenAI from "openai"
import z from "zod"

import { messageSummaryAgent } from "@repo/ai/agents/message-summary-agent"
import { SUMMARIZE_TOKEN_THRESHOLD } from "@repo/constants"
import { Message } from "@repo/db"
import {
  createConversationSummary,
  getUnsummarizedMessagesForConversation,
  getUnsummarizedTokenCount
} from "@repo/db/queries/conversation"
import { logger } from "@/lib/logger"

import { createQueue } from "."

const chatSummarySchema = z.object({
  data: z.object({
    conversationId: z.string(),
    userId: z.string()
  })
})

export const {
  add: addChatSummaryJob,
  createJobStep,
  createWorker,
  q
} = createQueue("chat-summary", chatSummarySchema)

createWorker(async job => {
  const { data: jobData } = job.data

  const maybeSummarizeStep = createJobStep<
    void,
    {
      shouldSummarize: boolean
      tokenCount: number
    }
  >("maybe-summarize", async ({ complete, reject }) => {
    try {
      const {
        _sum: { tokenCount = 0 }
      } = await getUnsummarizedTokenCount({
        conversationId: jobData.conversationId,
        userId: jobData.userId
      })

      const shouldSummarize = (tokenCount ?? 0) >= SUMMARIZE_TOKEN_THRESHOLD

      complete({
        shouldSummarize,
        tokenCount: tokenCount ?? 0
      })
    } catch (error) {
      logger.error({
        error,
        message: "failed to queue message summarization",
        conversationId: jobData.conversationId,
        userId: jobData.userId
      })
      reject()
    }
  })

  const summaryAgentStep = createJobStep<OpenAI.ChatCompletionMessageParam[], string>(
    "summary-agent-step",
    async ({ complete, reject }) => {
      try {
        const messages = await getUnsummarizedMessagesForConversation({
          conversationId: jobData.conversationId,
          userId: jobData.userId
        })

        const summary = await messageSummaryAgent({
          messages: messages.map((message: Message) => ({
            content: message.content,
            role: message.role
          })) as OpenAI.ChatCompletionMessageParam[]
        })

        const firstMessage = messages[0] as Message
        const lastMessage = messages[messages.length - 1] as Message

        const summaryTokenCount = countTokens(summary)

        await createConversationSummary({
          conversationId: jobData.conversationId,
          userId: jobData.userId,
          summary: summary,
          tokenCount: summaryTokenCount,
          from: firstMessage.createdAt,
          to: lastMessage.createdAt,
          startingMessageId: firstMessage.id,
          endingMessageId: lastMessage.id,
          messageCount: messages.length
        })

        complete(summary)
      } catch (e) {
        logger.error({
          error: e,
          message: "failed to summarize messages",
          conversationId: jobData.conversationId,
          userId: jobData.userId
        })
        reject(new UnrecoverableError("Unable to summarize messages"))
      }
    }
  )

  const { shouldSummarize, tokenCount } = await maybeSummarizeStep.run()

  if (shouldSummarize) {
    logger.info({
      message: "Time to summarize messages",
      conversationId: jobData.conversationId,
      tokenCount,
      userId: jobData.userId
    })
    return await summaryAgentStep.run()
  }

  logger.info({
    message: "No need to summarize",
    conversationId: jobData.conversationId,
    userId: jobData.userId,
    tokenCount
  })

  return null
})
