import React from "react"
import { cn } from "@ui/lib/utils"
import ReactMarkdown from "react-markdown"
import rehypeHighlight from "rehype-highlight"
import remarkBreaks from "remark-breaks"

import { CustomMessage } from "./chat"
import MessageLoader from "./message-loader"

export const MdxContent = React.memo(function MdxContent({
  content,
  className = ""
}: {
  content: string
  role?: CustomMessage["role"]
  className?: string
  activeBotResponse?: boolean
}) {
  if (!content?.length) {
    return (
      <div className="w-full h-6 p-8 flex flex-col gap-1 uppercase text-xs font-semibold tracking-widest animate-pulse">
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
