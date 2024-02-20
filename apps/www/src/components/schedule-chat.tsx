"use client"

import { useRef, useState } from "react"
import { StudentProfile } from "@/db/graph"
import { canMoveCourse } from "@/db/schedule"
import { PromptComposer } from "@repo/ui/components/prompt-composer"
import { useJsonStream } from "stream-hooks"
import { z } from "zod"

import { rescheduleCourseAgent } from "@/ai/agents/schema"

export function ScheduleChat({ profile }: { profile: StudentProfile }) {
  const [prompt, setPrompt] = useState("")
  const [result, setResult] = useState<{
    prompt: string
    data: Partial<z.infer<typeof rescheduleCourseAgent>>
  }>({ prompt: "", data: {} })
  const [completedResults, setCompletedResults] = useState<
    { prompt: string; data: Partial<z.infer<typeof rescheduleCourseAgent>> }[]
  >([])
  const [searchMode, setSearchMode] = useState(false)

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
      setCompletedResults(prevResults => {
        return [
          ...prevResults,
          {
            prompt: lastPromptRef.current,
            data: data
          }
        ]
      })

      setResult({ prompt: "", data: data })
    }
  })

  const submitMessage = async () => {
    lastPromptRef.current = prompt
    setSearchMode(true)

    try {
      setResult({
        prompt,
        data: {}
      })

      setPrompt("")
      await startStream({
        url: "/api/ai/agents/schedule",
        method: "POST",
        body: {
          prompt,
          messages: [
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
      <pre>{JSON.stringify(result.data, null, 2)}</pre>
      <div>
        {!loading &&
          canMoveCourse(result.data.course_name ?? "", result.data.toSemester ?? -1, profile)}
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
