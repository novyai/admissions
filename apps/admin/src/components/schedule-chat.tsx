"use client"

import { useRef, useState } from "react"
import { rescheduleAgent } from "@repo/ai/agents/reschedule-agent"
import { getCourseFromIdNameCode } from "@repo/graph/course"
import { canMoveCourse } from "@repo/graph/schedule"
import { StudentProfile } from "@repo/graph/types"
import { PromptComposer } from "@repo/ui/components/prompt-composer"
import { useJsonStream } from "stream-hooks"
import { z } from "zod"

export function ScheduleChat({ profile }: { profile: StudentProfile }) {
  const [prompt, setPrompt] = useState("")
  const [result, setResult] = useState<{
    prompt: string
    data: Partial<z.infer<typeof rescheduleAgent>>
  }>({ prompt: "", data: {} })

  const lastPromptRef = useRef<string>("")

  const { startStream, stopStream, loading } = useJsonStream({
    schema: rescheduleAgent,
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

  const course = getCourseFromIdNameCode(profile, result.data.course_name ?? "")

  return (
    <>
      <div>
        <p>
          Trying to move {course.name} to semester: {result.data.toSemester}
        </p>
        <br />
        {!loading && (
          <pre>
            {canMoveCourse(course.id, result.data.toSemester ?? -1, profile).canMove ?
              "Can move"
            : "Can't move"}
          </pre>
        )}
      </div>
      <div className="w-full max-w-lg mx-auto">
        <PromptComposer jumbo loading={loading} onSubmit={submitMessage} onCancel={stopStream} />
      </div>
    </>
  )
}
