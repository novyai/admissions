"use client"

import React from "react"
import { Message } from "@repo/db"
import { motion } from "framer-motion"
import ReactMarkdown from "react-markdown"
import rehypeHighlight from "rehype-highlight"
import remarkBreaks from "remark-breaks"

import { cn } from "@/lib/utils"

import MessageLoader from "./message-loader"

export const MessageWrapper = React.memo(function MessageWrapper({
  children,
  className = "",
  message
}: {
  children: React.ReactNode
  className?: string
  message: Partial<Message>
}) {
  return (
    <div
      className={cn(`relative text-foreground/90`, className, {
        "bg-transparent dark:bg-transparent text-foreground/90": message.role === "assistant",
        "mx-0 flex pt-2": message.role === "user"
      })}
    >
      <div>
        <strong className="text-xs font-semibold tracking-widest text-accent-foreground">
          [ {message.role === "user" ? "YOU" : "AI ADVISOR"} ]
        </strong>
        <div
          className={cn("pt-1 pl-2", {
            "py-1 px-2 flex gap-1": message.role === "user"
          })}
        >
          {children}
        </div>
      </div>
    </div>
  )
})

export const MdxContent = React.memo(function MdxContent({
  content,
  className = "",
  activeBotResponse = false
}: {
  content: Message["content"]
  role?: Message["role"]
  className?: string
  activeBotResponse?: boolean
}) {
  if (!content?.length && activeBotResponse) {
    return (
      <div className="w-full h-12 p-8 flex flex-col gap-1 uppercase text-xs font-semibold tracking-widest animate-pulse">
        <MessageLoader />
      </div>
    )
  }

  return (
    <>
      <ReactMarkdown
        linkTarget="_blank"
        rehypePlugins={[rehypeHighlight]}
        remarkPlugins={[remarkBreaks]}
        className={cn("react-markdown-message prose dark:prose-invert max-w-full", className, {})}
        components={{
          a: ({ ...props }) => {
            return <a {...props} className="text-sky-8 hover:text-sky-9 underline" />
          },
          img: ({ src }) => {
            return (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  className="max-w-full rounded-lg shadow-md md:max-w-sm"
                  alt="message image"
                />
              </>
            )
          }
        }}
      >
        {content ?? ""}
      </ReactMarkdown>
    </>
  )
})

type MessageProps = Partial<Message>

export const ChatMessage = React.memo(function ChatMessage({
  message,
  lastMessageAndIsBotMessage,
  loading
}: {
  index: number
  message: MessageProps
  lastMessageAndIsBotMessage: boolean
  submitMessage: (content: string) => void
  loading?: boolean
  disabled?: boolean
}) {
  return (
    <motion.li
      layoutScroll
      initial={{
        opacity: 0,
        y: 50
      }}
      animate={{
        opacity: 1,
        y: 0
      }}
      transition={{
        type: "spring",
        damping: 20,
        stiffness: 100,
        delay: lastMessageAndIsBotMessage ? 0.5 : 0
      }}
      className={cn("p-1 relative", {
        "bg-background/30 backdrop-blur-lg rounded-2xl p-1": message.role === "assistant"
      })}
    >
      <MessageWrapper message={message}>
        <MdxContent
          activeBotResponse={lastMessageAndIsBotMessage && loading}
          content={message?.content ?? ""}
          role={message.role}
        />
      </MessageWrapper>
    </motion.li>
  )
})

export const AssistantChat = React.memo(function AssistantChat(chatProps: {
  messages: MessageProps[]
  submitMessage: (content: string) => void
  botSearching?: boolean
  loading?: boolean
  disabled?: boolean
}) {
  const { messages, ...messageProps } = chatProps
  return (
    <>
      <ul className="space-y-1 pb-[6rem] px-0">
        {chatProps.messages.map((message, index) => {
          const lastMessageAndIsBotMessage =
            index === messages?.length - 1 && message.role === "assistant"
          return (
            <ChatMessage
              lastMessageAndIsBotMessage={lastMessageAndIsBotMessage}
              index={index}
              key={`message-${index}`}
              {...messageProps}
              message={message}
            />
          )
        })}
      </ul>
    </>
  )
})
