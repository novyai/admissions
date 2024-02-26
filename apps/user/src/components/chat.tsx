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
            <Message
              key={index}
              message={message}
              studentProfile={profile}
              setStudentProfile={setProfile}
            />
          ))}
        {Object.keys(partial ?? {}).length > 0 && (
          <div>
            <strong>Assistant:</strong>
            <pre>{JSON.stringify(partial)}</pre>
          </div>
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

const Message = ({
  message,
  studentProfile,
  setStudentProfile
}: {
  studentProfile: StudentProfile
  setStudentProfile: (profile: StudentProfile) => void
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
          <RescheduleCourse
            courseName={advisor_output.course_name}
            toSemester={advisor_output.toSemester}
            profile={studentProfile}
            setProfile={setStudentProfile}
          />
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
            <SemesterDisplay semester={advisor_output.semester - 1} profile={studentProfile} />
          </div>
        )
      } else if (advisor_output.type === "display-course") {
        return <CourseDisplay course={advisor_output.course_name} profile={studentProfile} />
      } else if (advisor_output.type === "4-year-plan") {
        return ScheduleTable({ profile: studentProfile })
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

const CourseDisplay = ({ course, profile }: { course: string; profile: StudentProfile }) => {
  console.log("displaying course", course)
  const courseNode = getCourseFromNameOrCode(profile, course)

  if (!courseNode) {
    return <div>Course {course} not found</div>
  }

  return (
    <div>
      <h2>{courseNode.name}</h2>
      <p>Earliest Finish: {courseNode.earliestFinish}</p>
      <p>Latest Finish: {courseNode.latestFinish}</p>
      <p>Slack: {courseNode.latestFinish! - courseNode.earliestFinish!}</p>
      <p>Required For: {getAllRequiredCourses(courseNode.id, profile.graph).join(", ")}</p>
      <p>Semester: {profile.semesters.findIndex(s => s.some(c => c.id === courseNode.id)) + 1}</p>
      <p>Direct Prerequisites: {courseNode.prerequisites.join(", ")}</p>
    </div>
  )
}

const RescheduleCourse = ({
  courseName,
  toSemester,
  profile,
  setProfile
}: {
  courseName: string
  toSemester: number
  profile: StudentProfile
  setProfile: (profile: StudentProfile) => void
}) => {
  const canMove = canMoveCourse(courseName, toSemester, profile)
  return (
    <div>
      <strong>Assistant:</strong>
      {`Checking if we can ${courseName} to semester ${toSemester}`}
      <br />
      {canMove.canMove ? (
        <Button
          onClick={() => {
            setProfile(moveCourse(courseName, toSemester, profile))
          }}
        >
          Confirm Move
        </Button>
      ) : (
        <p className="text-red-500">{`Cannot move course: ${canMove.reason}`}</p>
      )}
    </div>
  )
}
