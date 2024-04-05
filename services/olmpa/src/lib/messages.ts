import OpenAI from "openai"

import { countTokens } from "@repo/ai/lib/tokens"
import { MAX_TOKEN_COUNT_PER_COMPLETION } from "@repo/constants"
import { ConversationSummary, Message, MessageRole } from "@repo/db"

export function getPreparedMessages({
  conversationId,
  summaries = [],
  unsummarizedMessages = [],
  ctxMessages = []
}: {
  conversationId: string
  summaries?: ConversationSummary[]
  unsummarizedMessages?: Message[]
  ctxMessages?: {
    content: string
    role: MessageRole
    tokenCount?: number
  }[]
}): OpenAI.ChatCompletionMessageParam[] {
  const combinedMessages = [...unsummarizedMessages]
  combinedMessages.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())

  const messages = [...combinedMessages, ...ctxMessages]

  const preparedMessages: Partial<Message>[] = []

  let totalTokenCount = 0
  let summariesTokenCount = 0

  messages.forEach(message => {
    const messageTokenCount = message?.tokenCount ?? countTokens(message.content)
    totalTokenCount += messageTokenCount

    preparedMessages.push({
      content: message.content,
      role: message.role,
      tokenCount: messageTokenCount
    })
  })

  summaries.forEach(summary => {
    totalTokenCount += summary.tokenCount
    summariesTokenCount += summary.tokenCount
  })

  if (totalTokenCount < MAX_TOKEN_COUNT_PER_COMPLETION) {
    const preparedSummaries = summaries.map(summary => ({
      content: `(summary of ${summary.messageCount} messages: ${summary.summary}`,
      role: MessageRole.system
    }))

    return [...preparedSummaries, ...preparedMessages] as OpenAI.ChatCompletionMessageParam[]
  }

  console.warn(
    `Total token count of ${totalTokenCount} exceeds the maximum of ${MAX_TOKEN_COUNT_PER_COMPLETION} for conversation ${conversationId}`
  )

  const tokensToRemove = totalTokenCount - MAX_TOKEN_COUNT_PER_COMPLETION

  const summaryMessages: Partial<Message>[] = []
  let updatedMessages: Partial<Message>[] = []

  if (tokensToRemove < summariesTokenCount) {
    updatedMessages = preparedMessages
    let summaryRemovalTokenCount = 0

    summaries.forEach(summary => {
      if (summaryRemovalTokenCount >= tokensToRemove) {
        summaryMessages.push({
          content: `(summary created date: ${summary.createdAt}) | (summary of ${summary.messageCount}: \n ${summary.summary}`,
          role: MessageRole.system
        })

        return
      }

      summaryRemovalTokenCount += summary.tokenCount
    })
  } else {
    let messageRemovalTokenCount = 0
    preparedMessages.forEach(message => {
      if (messageRemovalTokenCount >= tokensToRemove - summariesTokenCount) {
        updatedMessages.push({
          content: message.content,
          role: message.role
        })

        return
      }

      messageRemovalTokenCount += message?.tokenCount ?? countTokens(message.content ?? "")
    })
  }

  return [...summaryMessages, ...updatedMessages] as OpenAI.ChatCompletionMessageParam[]
}
