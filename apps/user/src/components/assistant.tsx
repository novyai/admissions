"use client"

import { useEffect, useRef, useState } from "react"
import { Conversation, Message, MessageRole } from "@repo/db"
import { PromptComposer } from "@repo/ui/components/prompt-composer"
import { ScrollArea } from "@repo/ui/components/ui/scroll-area"

import { cn } from "@/lib/utils"
import { useAdvisor } from "@/hooks/use-advisor"

import { AssistantChat } from "./assistant-chat"
import { ChatScrollAnchor } from "./chat-scroll-anchor"
import { ScrollToBottom } from "./scroll-to-bottom"

export function Assistant({
  conversation
}: {
  conversation: Conversation & {
    messages: Message[]
  }
}) {
  const ChatScrollerRef = useRef<HTMLDivElement>(null)
  const [prompt, setPrompt] = useState("")

  const { messages, sendMessage, loading, isConnected, waiting, ready } = useAdvisor({
    conversationId: conversation.id,
    initialMessages: conversation?.messages ?? [],
    userId: conversation.userId,
    versionId: null,
    setSelectedVersion: null,
    handleAppointmentTimes: null
  })

  function scrollToEnd({ now = false }: { now?: boolean }) {
    ChatScrollerRef?.current?.scrollTo({
      top: ChatScrollerRef?.current?.scrollHeight,
      behavior: now ? "auto" : "smooth"
    })
  }

  async function submitMessage(content: string, role?: MessageRole) {
    if (loading) {
      return
    }

    setPrompt("")
    scrollToEnd({ now: true })

    sendMessage(content, role)

    setTimeout(() => {
      scrollToEnd({})
    }, 1000)
  }

  const handleInput = (event: React.ChangeEvent<HTMLInputElement>): void => {
    setPrompt(event.target.value ?? "")
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === "Enter") {
      event.preventDefault()
      submitMessage(prompt)
    }
  }

  useEffect(() => {
    setTimeout(() => {
      scrollToEnd({ now: true })
    }, 0)
  }, [])

  return (
    <div className="w-full h-full flex-1 flex flex-col-reverse lg:flex-col overflow-hidden">
      <div className="flex flex-col-reverse flex-1 w-full h-[calc(100%-146px)] overflow-hidden">
        <div
          className={cn(
            "w-full h-full grow lg:h-full flex flex-col overflow-hidden lg:border-l-[1px] border-accent"
          )}
        >
          <div className={cn("h-full w-full flex flex-col overflow-hidden")}>
            <div className="w-full bg-muted/10 h-full overflow-hidden">
              <div className="flex flex-col w-full h-full overflow-hidden">
                <div className="h-[calc(100dvh-140px)] w-screen">
                  <div className="items-start flex w-full">
                    <ScrollArea
                      className={cn("h-[calc(100dvh-140px)] w-full", {})}
                      ref={ChatScrollerRef}
                    >
                      <div className="max-w-7xl mx-auto px-6">
                        <AssistantChat
                          messages={messages}
                          disabled={!ready}
                          submitMessage={submitMessage}
                          loading={loading}
                        />
                        {ChatScrollerRef?.current && (
                          <ChatScrollAnchor
                            trackVisibility={waiting || loading}
                            scrollerRef={ChatScrollerRef}
                          />
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
                <div className="w-full fixed left-0 bottom-[76px]  bg-gradient-to-t from-background/90 to-transparent"></div>
                <div className="p-4 relative border-t-[1px] border-accent bg-background">
                  <div className="hidden lg:block absolute top-[-13px] left-0 w-full h-[12px] bg-gradient-to-t from-background/70 to-transparent" />
                  <ScrollToBottom scrollerRef={ChatScrollerRef} className="top-[-48px]" />
                  <div className="flex items-center justify-center gap-4 w-full flex-col">
                    <div className="w-full max-w-xl flex items-center gap-2">
                      <div className="w-full">
                        <PromptComposer
                          disabled={!ready || !isConnected}
                          placeholder={"Ask me anything..."}
                          loading={loading}
                          onChange={handleInput}
                          onKeyDown={handleKeyDown}
                          onSubmit={submitMessage}
                          prompt={prompt}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
