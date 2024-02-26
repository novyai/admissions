"use client"

import { useRef, useState } from "react"
import { AdvisorAgent, advisorAgentSchema } from "@/agents/advisor/schema"
import { User } from "@db/client"
import { canMoveCourse } from "@graph/schedule"
import { StudentProfile } from "@graph/types"
import { PromptComposer } from "@ui/components/prompt-composer"
import { DataTable } from "@ui/components/table"
import OpenAI from "openai"
import { useJsonStream } from "stream-hooks"

import { getScheduleTableColumns } from "./schedule-table"

type CustomMessage = {
  role: OpenAI.ChatCompletionMessageParam["role"]
  content: unknown
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
      console.log(prompt, messages)
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
      <p>{`Chat for student ${student.studentId}`}</p>
      <div>
        {messages.map((message, index) => (
          <Message key={index} message={message} studentProfile={studentProfile} />
        ))}
        {partial && (
          <div>
            <strong>Assistant:</strong>
            <pre>{JSON.stringify(partial)}</pre>
          </div>
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

const Message = ({
  message,
  studentProfile
}: {
  studentProfile: StudentProfile
  message: {
    role: OpenAI.ChatCompletionMessageParam["role"]
    content: unknown
  }
}) => {
  const { role, content } = message

  if (role === "user") {
    return (
      <p>
        <strong>User:</strong> {content as string}
      </p>
    )
  } else {
    const output = advisorAgentSchema.safeParse(content as string)

    if (output.success) {
      const advisor_output = output.data.advisor_output

      if (advisor_output.type === "rescheduleCourse") {
        return (
          <p>
            <strong>Assistant:</strong>{" "}
            {`Lets check if we can ${advisor_output.course_name} to semester ${advisor_output.toSemester}`}
            {canMoveCourse(
              advisor_output.course_name,
              advisor_output.toSemester,
              studentProfile
            ) ? (
              <span>Yes, we can move the course</span>
            ) : (
              <span>No, we cannot move the course</span>
            )}
          </p>
        )
      } else if (advisor_output.type === "conversation") {
        return (
          <p>
            <strong>Assistant:</strong> {advisor_output.response}
          </p>
        )
      } else if (advisor_output.type === "error") {
        return <p className="text-red-500">{`Assistant Error: ${advisor_output.error}`}</p>
      } else if (advisor_output.type === "display-semester") {
        return (
          <div>
            <strong>Assistant:</strong> {`Displaying semester ${advisor_output.semester}`}
            <SemesterDisplay semester={advisor_output.semester} profile={studentProfile} />
          </div>
        )
      } else {
        return (
          <p>
            <strong>Assistant:</strong> {advisor_output.type} {JSON.stringify(advisor_output)}
          </p>
        )
      }
    } else {
      return <p>{`Assistant Error: COULD NOT PARSE ${JSON.stringify(content)}`}</p>
    }
  }
}

const SemesterDisplay = ({ semester, profile }: { semester: number; profile: StudentProfile }) => {
  const semesterCourses = profile.semesters[semester]

  if (!semesterCourses) {
    return <div>No courses in this semester</div>
  }

  return (
    <DataTable
      columns={getScheduleTableColumns(profile)}
      data={semesterCourses}
      rowCount={semesterCourses.length}
      search={false}
    />
  )
}
