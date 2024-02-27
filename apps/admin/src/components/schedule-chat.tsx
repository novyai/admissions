"use client"

import { useRef, useState } from "react"
import { PromptComposer } from "@repo/ui/components/prompt-composer"
import { useJsonStream } from "stream-hooks"
import { z } from "zod"

import { canMoveCourse } from "@graph/schedule"
import { StudentProfile } from "@graph/types"
import { rescheduleCourseAgent } from "@/ai/agents/schema"

export function ScheduleChat({ profile }: { profile: StudentProfile }) {
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
    }
  })

  const submitMessage = async () => {
    lastPromptRef.current = prompt

    try {
      setResult({
        prompt,
        data: {}
      })

      setPrompt("")
      startStream({
        url: "/api/ai/agents/schedule",
        method: "POST",
        body: {
          prompt,
          messages: [
            {
              role: "user",
              content: `
              Current Schedule:
              ${JSON.stringify(profile.semesters, null, 2)}`
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
      <div>
        <p>
          Trying to move {result.data.course_name} to semester: {result.data.toSemester}
        </p>
        <br />
        {!loading && (
          <pre>
            {canMoveCourse(result.data.course_name ?? "", result.data.toSemester ?? -1, profile).canMove ? "Can move" : "Can't move"}
          </pre>
        )}
      </div>
      <div className="w-full max-w-lg mx-auto">
        <PromptComposer
          jumbo
          prompt={prompt}
          loading={loading}
          onSubmit={submitMessage}
          onChange={(value: string) => setPrompt(value)}
          onCancel={stopStream}
        />
      </div>
    </>
  )
}
