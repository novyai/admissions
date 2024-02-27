"use client"

import { useRef, useState } from "react"
import { AdvisorAgent, advisorAgentSchema } from "@/agents/advisor/schema"
import { User } from "@db/client"
import { getCourseFromNameOrCode } from "@graph/course"
import { getAllRequiredCourses } from "@graph/graph"
import { canMoveCourse, moveCourse } from "@graph/schedule"
import { StudentProfile } from "@graph/types"
import { PromptComposer } from "@ui/components/prompt-composer"
import { DataTable } from "@ui/components/table"
import { Button } from "@ui/components/ui/button"
import OpenAI from "openai"
import { useJsonStream } from "stream-hooks"

import { ChatMessage } from "./chat-message"
import { getScheduleTableColumns, ScheduleTable } from "./schedule-table"

type CustomMessage = {
  role: OpenAI.ChatCompletionMessageParam["role"]
  content: unknown
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
          content: data,
          role: "assistant"
        }
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
      <div className="mb-20">
        {messages
          .filter(message => message?.show ?? true)
          .map((message, index) => (
            <ChatMessage
              key={index}
              message={message}
              studentProfile={profile}
              setStudentProfile={setProfile}
            />
          ))}
        {Object.keys(partial ?? {}).length > 0 && (
          <ChatMessage
            message={{
              role: "assistant",
              content: partial
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
