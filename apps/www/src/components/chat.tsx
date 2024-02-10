"use client"

import { useEffect, useRef, useState } from "react"
import { ChatScrollAnchor } from "@ui/components/chat-scroll-anchor"
import { PromptComposer } from "@ui/components/prompt-composer"
import { ScrollToBottom } from "@ui/components/scroll-to-bottom"
import { motion } from "framer-motion"

import { cn } from "@/lib/utils"
import { useChatStream } from "@hackdance/hooks"
import { FloatingChat } from "@/components/floating-chat"

export function Chat({ studentId }: { studentId: string }) {
  // @ts-ignore
  const [_mainChatRef, setMainChatRef] = useState<HTMLElement>(null)
  const [prompt, setPrompt] = useState("")
  const [messages, setMessages] = useState([])

  const ChatScrollerRef = useRef<HTMLDivElement>(null)
  const lastMessages = useRef([])
  const currentBotMessage = useRef("")

  function scrollToEnd({ now = false }: { now?: boolean }) {
    ChatScrollerRef?.current?.scrollTo({
      top: ChatScrollerRef?.current?.scrollHeight,
      behavior: now ? "auto" : "smooth"
    })
  }

  const { startStream, loading } = useChatStream({
    onBeforeStart: async () => {
      currentBotMessage.current = ""
      scrollToEnd({})
    },
    onReceive: async content => {
      currentBotMessage.current = currentBotMessage.current += content ?? ""

      const updatedMessages = [
        ...lastMessages?.current,
        {
          content: currentBotMessage.current,
          role: "assistant"
        }
      ]

      // @ts-ignore
      setMessages(updatedMessages)
    },
    onEnd: async ({ content }) => {
      const responseMessage = {
        content: content ?? "",
        role: "assistant"
      }

      const updatedMessages = [...lastMessages?.current, responseMessage]

      // @ts-ignore
      setMessages(updatedMessages)
      // @ts-ignore
      lastMessages.current = updatedMessages
      currentBotMessage.current = ""
    }
  })

  // @ts-ignore
  const sendMessage = async content => {
    if (!content.length || loading) return
    const updatedMessages = [
      ...lastMessages?.current,
      {
        content,
        role: "user"
      }
    ]

    // @ts-ignore
    setMessages(updatedMessages)
    // @ts-ignore
    lastMessages.current = updatedMessages

    setPrompt("")
    startStream({ ctx: { studentId, messages }, prompt: content, url: "/api/ai/chat" })
  }

  // @ts-ignore
  const handleInput = (value): void => {
    setPrompt(value ?? "")
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!event.shiftKey && event.key === "Enter") {
      event.preventDefault()
      sendMessage(prompt)
    }
  }

  useEffect(() => {
    scrollToEnd({ now: true })
  }, [])

  return (
    <main
      className="relative flex-1 h-full w-full relative overflow-hidden max-h-[50vh]"
      // @ts-ignore
      ref={setMainChatRef}
    >
      {!!messages?.length && (
        <motion.div
          layoutScroll
          className="flex-1 h-[calc(100%-90px)] w-full overflow-y-auto p-4"
          ref={ChatScrollerRef}
        >
          <FloatingChat messages={messages} />
          <ChatScrollAnchor trackVisibility={loading} scrollerRef={ChatScrollerRef} />
        </motion.div>
      )}
      <div
        className={cn({
          "p-4 relative": !!messages?.length
        })}
      >
        {!!messages?.length && (
          <>
            <div className="absolute top-[-12px] left-0 w-full h-[12px] bg-gradient-to-t from-background/70 to-transparent" />
            <ScrollToBottom scrollerRef={ChatScrollerRef} />
          </>
        )}
        <PromptComposer
          loading={loading}
          onChange={handleInput}
          // @ts-ignore
          onKeyDown={handleKeyDown}
          onSubmit={() => sendMessage(prompt)}
          prompt={prompt}
        />
      </div>
    </main>
  )
}
