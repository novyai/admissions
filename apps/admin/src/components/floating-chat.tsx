"use client"

import React from "react"
import ReactMarkdown from "react-markdown"
import rehypeHighlight from "rehype-highlight"

import { cn } from "@/lib/utils"

const MessageWrapper = ({
	children,
	className = "",
	message
}: {
	children: React.ReactNode
	className?: string
	message: {
		role: "assistant" | "user"
	}
}) => {
	return (
		<div
			className={cn(`mb-2 flex items-start w-full`, className, {
				"flex-row-reverse": message.role === "assistant",
				"flex-row ": message.role === "user"
			})}
		>
			<div
				className={cn(
					`rounded-xl px-4 shadow-sm relative prose dark:prose-invert max-w-fit min-w-[50%] max-w-[90%]`,
					className,
					{
						"bg-blue-9 text-[#fff]": message.role === "assistant",
						"bg-slate-2": message.role === "user"
					}
				)}
			>
				{children}
			</div>
		</div>
	)
}

const MdxContent = ({ content, className = "" }: { content: string; className?: string }) => {
	return (
		<ReactMarkdown
			linkTarget="_blank"
			rehypePlugins={[rehypeHighlight]}
			className={cn("react-markdown-message m-0 p-0", className)}
			components={{
				a: ({ ...props }) => {
					return <a {...props} className="text-sky-8 hover:text-sky-9 underline" />
				},
				img: ({ src }) => {
					return (
						<div className="">
							{/* eslint-disable-next-line @next/next/no-img-element */}
							<img
								src={`/api/images/fallback?imageUri=${src}`}
								className="max-w-full rounded-lg shadow-md md:max-w-sm"
								alt="message image"
							/>
						</div>
					)
				}
			}}
		>
			{content}
		</ReactMarkdown>
	)
}

export function FloatingChat({
	messages
}: {
	messages: {
		content: string
		role: "assistant" | "user"
		createdAt: string
	}[]
}) {
	return (
		<>
			<ul>
				{messages.map((message, i) => {
					return (
						<li key={message?.createdAt ?? i} className={`mb-4 w-full`}>
							<MessageWrapper message={message}>
								<MdxContent content={message.content} />
							</MessageWrapper>
						</li>
					)
				})}
			</ul>
		</>
	)
}
