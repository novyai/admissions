"use client"

import { useRef, useState } from "react"
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
  const [prompt, setPrompt] = useState("")

  const [profile, setProfile] = useState(studentProfile)

  const [partial, setPartial] = useState<Partial<AdvisorAgent> | null>({})

  const lastPromptRef = useRef<string>("")

  const { startStream, stopStream, loading } = useJsonStream({
    schema: advisorAgentSchema,
    onReceive: (data: Partial<AdvisorAgent>) => {
      setPartial(data)
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
    }
  })

  const submitMessage = async () => {
    lastPromptRef.current = prompt

    try {
      startStream({
        url: "/api/ai/chat",
        method: "POST",
        body: {
          prompt,
          messages: [
            ...messages.map(
              ({ role, content }) =>
                ({
                  role,
                  content: JSON.stringify(content)
                }) as OpenAI.ChatCompletionMessageParam
            ),

            // {
            //   content: "Current Schedule: " + JSON.stringify(studentProfile.semesters),
            //   role: "assistant"
            // },
            {
              content: prompt,
              role: "user"
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
      setPrompt("")
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <>
      <div className="mb-20 m-4 gap-4">
        {<pre>{JSON.stringify(messages, null, 2)}</pre>}
        {messages
          .filter(message => message?.show ?? true)
          .map((message, index) => (
            <ChatMessage
              student={student}
              key={index}
              message={message}
              studentProfile={profile}
              setStudentProfile={setProfile}
            />
          ))}
        {partial !== null && (
          <ChatMessage
            student={student}
            message={{
              role: "assistant",
              content: partial?.advisor_output ?? {
                response: "Loading...",
                actions: []
              }
            }}
            partial={true}
            studentProfile={profile}
            setStudentProfile={setProfile}
          />
        )}
      </div>
      <div className="fixed bottom-0 p-4 w-full flex gap-4 items-center">
        <PromptComposer
          jumbo
          prompt={prompt}
          loading={loading}
          onSubmit={submitMessage}
          onChange={(value: string) => setPrompt(value)}
          onCancel={stopStream}
        />
        <Button
          size="lg"
          onClick={() => {
            setMessages(prevMessages => [
              ...prevMessages.map(message => ({
                ...message,
                show: false
              }))
            ])
          }}
        >
          Clear
        </Button>
      </div>
    </>
  )
}
