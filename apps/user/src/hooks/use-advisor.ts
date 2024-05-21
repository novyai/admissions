import { useCallback, useEffect, useRef, useState } from "react"
import { ConversationStreamData, SOCKET_EVENTS } from "@repo/constants"
import { Message, MessageRole } from "@repo/db"
import { toast } from "sonner"

import { useSocket } from "@/hooks/use-socket"
import { VersionWithoutBlob } from "@/components/editor/editor"

const NO_RESPONSE_TIMEOUT = 10000

export function useAdvisor({
  conversationId,
  initialMessages = [],
  userId,
  versions,
  handleSelectedVersion,
  handleAppointmentTimes,
  handleScrollToRequirementInAudit
}: {
  initialMessages?: Message[]
  conversationId: string
  artifacts?: {}
  userId: string | null
  versions: VersionWithoutBlob[] | null
  handleSelectedVersion: ((versionId: string) => void) | null
  handleAppointmentTimes: ((times: Date[]) => void) | null
  handleScrollToRequirementInAudit: ((requirementGroupOrSubgroupId: string) => void) | null
}) {
  const [messages, setMessages] = useState<Partial<Message>[]>(initialMessages ?? [])

  // const [action, setAction] = useState<{ action?: string; actionParams?: unknown }>()

  const [loading, setLoading] = useState(false)
  const [waiting, setWaiting] = useState(false)
  const loadingTimeoutRef = useRef<number | null>(null)

  const lastMessages = useRef<Partial<Message>[]>(messages)
  const lastPrompt = useRef<string>("")

  const { isConnected } = useSocket({
    userId,
    streamId: `${conversationId}-${userId}`,
    listeners: {
      [SOCKET_EVENTS.START_CONVERSATION_STREAM]: () => {
        setLoading(true)
        setWaiting(true)
      },
      [SOCKET_EVENTS.COMPLETE_CONVERSATION_STREAM]: () => {
        setLoading(false)
        setWaiting(false)
      },
      [SOCKET_EVENTS.NEW_VERSION]: ({ versionId }) => {
        if (handleSelectedVersion) {
          handleSelectedVersion(versionId)
        }
      },
      [SOCKET_EVENTS.SHOW_APPOINTMENT]: () => {
        if (handleAppointmentTimes) {
          handleAppointmentTimes([
            new Date(1713985200000),
            new Date(1714143600000),
            new Date(1714411800000)
          ])
        }
      },
      [SOCKET_EVENTS.SCROLL_TO_REQUIREMENT_IN_AUDIT]: ({ requirementGroupOrSubgroupId }) => {
        if (handleScrollToRequirementInAudit) {
          handleScrollToRequirementInAudit(requirementGroupOrSubgroupId)
        }
      },
      [SOCKET_EVENTS.CONVERSATION_STREAM]: ({
        data,
        complete = false,
        messageStreamIndex
      }: ConversationStreamData["data"]) => {
        const updatedMessages = [...lastMessages.current]
        updatedMessages[messageStreamIndex] = {
          ...updatedMessages[messageStreamIndex],
          content: data?.content ?? "",
          role: "assistant"
        }

        lastMessages.current = updatedMessages
        setMessages(updatedMessages)

        if (!loading && !complete) {
          setLoading(true)
          setWaiting(true)
        }
      }
    }
  })

  const sendMessage = useCallback(
    async (prompt: string, role: MessageRole = "user") => {
      if (loading) return

      setLoading(true)
      setWaiting(true)

      const messageRevert = [...messages]

      lastPrompt.current = prompt
      lastMessages.current = [
        ...messages,
        {
          content: prompt,
          role: role
        },
        {
          content: "",
          role: "assistant"
        }
      ]

      setMessages(lastMessages?.current)

      try {
        const messageStreamIndex = lastMessages.current.length - 1

        await fetch("/api/ai/chat", {
          method: "POST",
          body: JSON.stringify({
            prompt: prompt,
            conversationId,
            messageStreamIndex: messageStreamIndex > 0 ? messageStreamIndex : 0,
            userId,
            meta: {},
            streamId: `${conversationId}-${userId}`,
            versionId: versions?.at(-1)?.id
          })
        })
      } catch (e) {
        lastMessages.current = messageRevert
        setMessages(messageRevert)
        setLoading(false)

        toast("We couldn't send your message. Please try again.")
      }
    },
    [conversationId, loading, messages, userId, versions]
  )

  useEffect(() => {
    if (loading) {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current)
      }

      loadingTimeoutRef.current = window.setTimeout(() => {
        setLoading(false)
        setWaiting(false)
        // revalidateConversation(conversationId)
      }, NO_RESPONSE_TIMEOUT)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading])

  return {
    loading: loading,
    sendMessage,
    isConnected,
    ready: !!userId,
    waiting,
    messages: messages.filter(m => m.role === "assistant" || m.role === "user")
  }
}
