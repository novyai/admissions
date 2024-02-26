"use client"

import { useRef, useState } from "react"
import { rescheduleCourseAgent } from "@/agents/rescheduler/schema"
import { User } from "@db/client"
import { canMoveCourse } from "@graph/schedule"
import { StudentProfile } from "@graph/types"
import { PromptComposer } from "@ui/components/prompt-composer"
import OpenAI from "openai"
import { useJsonStream } from "stream-hooks"
import { z } from "zod"

export function Chat({
  studentProfile,
  student
}: {
  studentProfile: StudentProfile
  student: User
}) {
  const [messages, setMessages] = useState<OpenAI.ChatCompletionMessageParam[]>([])
  const [prompt, setPrompt] = useState("")
  const [result, setResult] = useState<{
    prompt: string
    data: Partial<z.infer<typeof rescheduleCourseAgent>>
  }>({ prompt: "", data: {} })

  const lastPromptRef = useRef<string>("")

  const { startStream, stopStream, loading } = useJsonStream({
    schema: rescheduleCourseAgent,
    onReceive: data => {
      setResult(prevResult => ({
        prompt: prevResult.prompt,
        data
      }))
    },
    onEnd: data => {
      setResult({ prompt: "", data: data })

      setMessages(prevMessages => [
        ...prevMessages,
        {
          content: data.course_name ?? "unknown",
          role: "assistant"
        }
      ])
    }
  })

  const submitMessage = async () => {
    lastPromptRef.current = prompt

    setMessages(prevMessages => [
      ...prevMessages,
      {
        content: prompt,
        role: "user"
      }
    ])

    try {
      setResult({
        prompt,
        data: {}
      })

      setPrompt("")
      await startStream({
        url: "/api/ai/chat",
        method: "POST",
        body: {
          prompt,
          messages: [
            {
              role: "user",
              content: `
              Current Schedule:
              ${JSON.stringify(studentProfile.semesters, null, 2)}`
            },
            {
              content: prompt,
              role: "user"
            }
          ]
        }
      })
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <>
      <p>{`Chat for student ${student.studentId}`}</p>
      <div>
        {messages.map((message, index) => (
          <div key={index} className={message.role}>
            {message.content as string}
          </div>
        ))}
      </div>
      <div>
        <p>
          Trying to move {result.data.course_name ?? "unknown"} to semester:{" "}
          {result.data.toSemester ?? "unknown"}
        </p>
        <br />
        {!loading && (
          <pre>
            {canMoveCourse(
              result.data.course_name ?? "",
              result.data.toSemester ?? -1,
              studentProfile
            )}
          </pre>
        )}
      </div>
      <PromptComposer
        jumbo
        prompt={prompt}
        loading={loading}
        onSubmit={submitMessage}
        onChange={(value: string) => setPrompt(value)}
        onCancel={stopStream}
      />
    </>
  )
}
