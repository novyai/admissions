"use server"

import Prisma, { db, MessageRole, MessageType } from "@repo/db"

export const getConversationById = async ({ id }: { id: string }) => {
  return await db.conversation.findUnique({
    where: { id },
    include: {
      messages: {
        orderBy: { createdAt: "asc" }
      }
    }
  })
}

export const getUnsummarizedMessagesForConversation = async ({
  conversationId,
  userId
}: {
  conversationId: string
  userId: string
}) => {
  return await db.message.findMany({
    where: {
      conversation: {
        id: conversationId,
        userId
      },
      summarized: false
    },
    orderBy: { createdAt: "asc" }
  })
}

export const getAllConversationForUser = async ({ userId }: { userId: string }) => {
  return await db.conversation.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" }
  })
}

export const getSummariesForConversation = async ({
  conversationId,
  userId
}: {
  conversationId: string
  userId: string
}) => {
  return await db.conversationSummary.findMany({
    where: { conversationId, userId },
    orderBy: { createdAt: "asc" },
    take: 3
  })
}

export const getAggregatedTokenCountForRange = async ({
  conversationId,
  userId,
  start,
  end
}: {
  conversationId: string
  userId: string
  start: Date
  end: Date
}) => {
  return await db.message.aggregate({
    _sum: {
      tokenCount: true
    },
    where: {
      conversation: {
        id: conversationId,
        userId
      },
      createdAt: {
        gte: start,
        lte: end
      }
    }
  })
}

export const getUnsummarizedTokenCount = async ({
  conversationId,
  userId
}: {
  conversationId: string
  userId: string
}) => {
  return await db.message.aggregate({
    _sum: {
      tokenCount: true
    },
    where: {
      conversation: {
        id: conversationId,
        userId
      },
      summarized: false
    }
  })
}

export const getUnsummarizedMessages = async ({
  conversationId,
  userId
}: {
  conversationId: string
  userId: string
}) => {
  return await db.message.findMany({
    where: {
      conversation: {
        id: conversationId,
        userId
      },
      summarized: false
    }
  })
}

export const markMessagesAsSummarized = async ({
  conversationId,
  userId
}: {
  conversationId: string
  userId: string
}) => {
  return await db.message.updateMany({
    where: {
      conversation: {
        id: conversationId,
        userId
      },
      summarized: false
    },
    data: {
      summarized: true
    }
  })
}

export const createConversationSummary = async ({
  conversationId,
  userId,
  summary,
  tokenCount,
  from,
  to,
  startingMessageId,
  endingMessageId,
  messageCount
}: {
  conversationId: string
  userId: string
  summary: string
  tokenCount: number
  from: Date
  to: Date
  startingMessageId: string
  endingMessageId: string
  messageCount: number
}) => {
  return await db.$transaction(async tx => {
    await tx.conversationSummary.create({
      data: {
        conversationId,
        userId,
        summary,
        tokenCount,
        from,
        to,
        startingMessageId,
        endingMessageId,
        messageCount
      }
    })

    await tx.message.updateMany({
      where: {
        conversation: {
          id: conversationId,
          userId
        },
        summarized: false
      },
      data: {
        summarized: true
      }
    })
  })
}

export const createConversation = async ({
  title,
  initialMessage,
  userId
}: {
  title?: string
  userId: string
  initialMessage?: {
    content: string
    role: MessageRole
    type: MessageType
    tokenCount: number
  }
}) => {
  return await db.conversation.create({
    include: {
      messages: true
    },
    data: {
      user: {
        connect: {
          id: userId
        }
      },
      title,
      messages:
        initialMessage ?
          {
            create: {
              ...initialMessage,
              userId
            }
          }
        : undefined
    }
  })
}

export const createConversationFromClerkUser = async ({
  title,
  initialMessage,
  userId
}: {
  title?: string
  userId: string
  initialMessage?: {
    content: string
    role: MessageRole
    type: MessageType
    tokenCount: number
  }
}) => {
  return await db.conversation.create({
    include: {
      messages: true
    },
    data: {
      user: {
        connect: {
          uid: userId
        }
      },
      title,
      messages:
        initialMessage ?
          {
            create: {
              ...initialMessage,
              userId
            }
          }
        : undefined
    }
  })
}

export const createMessages = async ({
  conversationId,
  messages
}: {
  conversationId: string
  messages: {
    content: string
    role: MessageRole
    type: MessageType
    tokenCount: number
    userId: string
  }[]
  userId?: string
}) => {
  return Promise.all(
    messages.map(async message => {
      return await db.message.create({
        data: {
          ...message,
          conversationId
        }
      })
    })
  )
}

export const updateMessageMeta = async ({
  messageId,
  meta = {}
}: {
  messageId: string
  meta: Record<string, unknown>
}) => {
  return await db.message.update({
    where: {
      id: messageId
    },
    data: {
      artifacts: meta as unknown as Prisma.NullableJsonNullValueInput
    }
  })
}

export const getLast3MessagesForConversation = async ({
  conversationId,
  userId
}: {
  conversationId: string
  userId: string
}) => {
  return await db.message.findMany({
    select: {
      id: true,
      content: true,
      type: true,
      role: true,
      conversationId: true,
      createdAt: true
    },
    where: {
      role: {
        in: ["user", "assistant"]
      },
      conversation: {
        userId,
        id: conversationId
      }
    },
    orderBy: { createdAt: "desc" },
    take: 3
  })
}

export const getMessagesForConversation = async ({
  conversationId,
  userId,
  limit = undefined
}: {
  conversationId: string
  userId: string
  limit?: number
}) => {
  return await db.message.findMany({
    select: {
      id: true,
      content: true,
      type: true,
      role: true,
      conversationId: true,
      createdAt: true
    },
    where: {
      conversation: {
        userId,
        id: conversationId
      }
    },
    ...(limit && { take: limit }),
    orderBy: { createdAt: "asc" }
  })
}
