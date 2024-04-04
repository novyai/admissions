import { useCallback, useEffect, useRef, useState } from "react"
import { ConversationStreamData, EventSearchResult, SOCKET_EVENTS } from "@repo/constants"
import { Message, MessageRole } from "@repo/db"
import { toast } from "sonner"

import { useSocket } from "@/hooks/use-socket"

import useLocalStorage from "./use-local-storage"

const NO_RESPONSE_TIMEOUT = 10000

export function useAdvisor({
  conversationId,
  initialMessages = [],
  endUserId
}: {
  initialMessages?: Message[]
  conversationId: string
  artifacts?: {}
  endUserId: string | null
}) {
  const [messages, setMessages] = useState<Partial<Message>[]>(initialMessages ?? [])
  const [localArtifacts, setLocalArtifacts] = useState<EventSearchResult[] | null>(null)

  const [suggestedResponses, setSuggestedResponses] = useLocalStorage<string[]>(
    `${conversationId}-suggestedResponses`,
    []
  )

  const [loading, setLoading] = useState(false)
  const [waiting, setWaiting] = useState(false)
  const loadingTimeoutRef = useRef<number | null>(null)

  const lastMessages = useRef<Partial<Message>[]>(messages)
  const lastPrompt = useRef<string>("")

  const { isConnected } = useSocket({
    endUserId,
    streamId: `${conversationId}-${endUserId}`,
    listeners: {
      [SOCKET_EVENTS.START_CONVERSATION_STREAM]: () => {
        setLoading(true)
        setWaiting(true)
      },
      [SOCKET_EVENTS.COMPLETE_CONVERSATION_STREAM]: () => {
        setLoading(false)
        setWaiting(false)
      },
      [SOCKET_EVENTS.EVENT_SEARCH_RESULTS]: ({ data }) => {
        setLocalArtifacts(data)
      },
      [SOCKET_EVENTS.CREATE_PURCHASE_LINK]: data => {
        setMessages([
          ...lastMessages.current,
          {
            content: `purchase data: ${JSON.stringify(data)}`,
            role: "assistant"
          }
        ])
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
            messageStreamIndex,
            endUserId,
            streamId: `${conversationId}-${endUserId}`,
            meta: {
              ...localArtifacts
            }
          })
        })
      } catch (e) {
        lastMessages.current = messageRevert
        setMessages(messageRevert)
        setLoading(false)

        toast("We couldn't send your message. Please try again.")
      }
    },
    [conversationId, loading, localArtifacts, messages, endUserId]
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
    artifacts: localArtifacts,
    loading: loading,
    sendMessage,
    isConnected,
    ready: !!endUserId,
    waiting,
    messages: messages.filter(m => m.role === "assistant" || m.role === "user"),
    suggestedResponses,
    clearSuggestions: () => setSuggestedResponses([])
  }
}
