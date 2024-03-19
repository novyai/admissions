"use client"

import { useEffect, useRef, useState } from "react"
import { AdvisorAgent, advisorAgentSchema } from "@/agents/advisor/schema"
import { User } from "@db/client"
import { StudentProfile } from "@graph/types"
import { PromptComposer } from "@ui/components/prompt-composer"
import { Button } from "@ui/components/ui/button"
import OpenAI from "openai"
import { useJsonStream } from "stream-hooks"

import { ChatMessage } from "./chat-message"

export type CustomMessage =
	| {
		role: "user"
		content: string
		show?: boolean
	}
	| {
		role: "assistant"
		content: AdvisorAgent["advisor_output"]
		show?: boolean
	}

export function Chat({
	studentProfile,
	student
}: {
	studentProfile: StudentProfile
	student: User
}) {
	const [messages, setMessages] = useState<CustomMessage[]>([])

	const [profile, setProfile] = useState(studentProfile)

	const [partial, setPartial] = useState<Partial<AdvisorAgent> | null>({})

	const [suggestedResponses, setSuggestedResponses] = useState<string[]>([])

	const lastPromptRef = useRef<string>("")

	const { startStream, stopStream, loading } = useJsonStream({
		schema: advisorAgentSchema,
		onReceive: (data: Partial<AdvisorAgent>) => {
			setPartial(data)
			setSuggestedResponses(data.advisor_output?.suggestedResponses ?? [])
		},
		onEnd: data => {
			setPartial(null)
			setMessages(prevMessages => [
				...prevMessages,
				{
					content: data.advisor_output,
					role: "assistant"
				} as CustomMessage
			])

			setSuggestedResponses(data.advisor_output.suggestedResponses)
		}
	})

	const submitMessage = async (prompt: string) => {
		lastPromptRef.current = prompt

		try {
			startStream({
				url: "/api/ai/chat",
				method: "POST",
				body: {
					messages: [
						...messages.map(
							({ role, content }) =>
								({
									role,
									content: role == "user" ? content : content.response
								}) as OpenAI.ChatCompletionMessageParam
						),
						{
							role: "user",
							content: `
								My current schedule looks like this:
								${profile.semesters.map((s, i) => `Semester ${i + 1}: ${s.map(c => c.name).join(", ")}`).join("\n")}}
							
								More instructions: 
								- Trigger actions instead of outputting text. 
								- Don't display multiple courses using the display-course action.
								- Don't say you can move a course because it might not be possible.
								`
						},
						{
							role: "user",
							content: prompt
						}
					]
				}
			})
			setMessages(prevMessages => [
				...prevMessages,
				{
					content: prompt,
					role: "user"
				}
			])

			setSuggestedResponses([])
		} catch (e) {
			console.error(e)
		}
	}

	useEffect(() => {
		// I want to generate a introductory message for the user
		startStream({
			url: "/api/ai/chat",
			method: "POST",
			body: {
				messages: [
					{
						role: "user",
						content: `The user is an incoming freshman and they are majoring in Computer Science and don't know anything about the degree. 
            
            Be friendly and engaging to try and learn more about the user. Tell them about the degree and what they can expect.
            
            Be short and concise.
            `
					}
				]
			}
		})
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	return (
		<>
			<div className="mb-20 m-8 pb-[150px] gap-4">
				{/* {<pre>{JSON.stringify(messages, null, 2)}</pre>} */}
				{messages
					.filter(message => message?.show ?? true)
					.map((message, index) => (
						<ChatMessage
							key={index}
							student={student}
							message={message}
							studentProfile={profile}
							setStudentProfile={setProfile}
						/>
					))}
				{partial && Object.keys(partial).length > 0 && (
					<ChatMessage
						student={student}
						message={{
							role: "assistant",
							content: partial?.advisor_output ?? {
								response: "loading...",
								actions: [],
								suggestedResponses: []
							}
						}}
						partial={true}
						studentProfile={profile}
						setStudentProfile={setProfile}
					/>
				)}
			</div>

			<div className="fixed bottom-0 p-4 flex flex-col w-full">
				<div className="flex flex-wrap gap-2 mt-2">
					{suggestedResponses?.map((response, index) => (
						<Button key={index} size="sm" onClick={() => submitMessage(response)}>
							{response}
						</Button>
					))}
				</div>
				<div className="flex w-full gap-4 items-center p-4">
					<PromptComposer jumbo loading={loading} onSubmit={submitMessage} onCancel={stopStream} />
				</div>
			</div>
		</>
	)
}
