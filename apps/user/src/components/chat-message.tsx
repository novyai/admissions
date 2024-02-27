import { ReactNode } from "react"
import { AdvisorAgent, advisorAgentSchema } from "@/agents/advisor/schema"
import { User } from "@db/client"
import { StudentProfile } from "@graph/types"

import { CustomMessage } from "./chat"
import { CourseDisplay } from "./messageHandlers/course-display"
import { RescheduleCourse } from "./messageHandlers/reschedule-course"
import { ScheduleTable } from "./messageHandlers/schedule-table"
import { SemesterDisplay } from "./messageHandlers/semester-display"

type ChatMessageSubType = AdvisorAgent["advisor_output"]["actions"][number]["type"]

type HandleChatMessage<T extends ChatMessageSubType> = (params: {
  studentProfile: StudentProfile
  setStudentProfile: (profile: StudentProfile) => void
  student: User
  advisor_output: Extract<AdvisorAgent["advisor_output"]["actions"][number], { type: T }>
}) => ReactNode

type ChatMessageHandler = {
  [K in ChatMessageSubType]: HandleChatMessage<K>
}

type ChatMesssageParams = {
  partial?: boolean
  student: User
  studentProfile: StudentProfile
  setStudentProfile: (profile: StudentProfile) => void
  message: CustomMessage
}

const chatMessageHandler: ChatMessageHandler = {
  "4-year-plan": ({ studentProfile }) => {
    return <ScheduleTable profile={studentProfile} />
  },
  "display-course": ({ advisor_output, studentProfile }) => {
    return <CourseDisplay course={advisor_output.course_name} profile={studentProfile} />
  },
  "error": ({ advisor_output }) => {
    return <p className="text-red-500">{`Assistant Error: ${advisor_output.error}`}</p>
  },
  "rescheduleCourse": ({ advisor_output, studentProfile, setStudentProfile }) => {
    return (
      <RescheduleCourse
        courseName={advisor_output.course_name}
        toSemester={advisor_output.toSemester}
        profile={studentProfile}
        setProfile={setStudentProfile}
      />
    )
  },
  "display-semester": ({ advisor_output, studentProfile }) => {
    return (
      <div>
        <strong>Assistant:</strong> {`Displaying semester ${advisor_output.semester}`}
        <SemesterDisplay semester={advisor_output.semester - 1} profile={studentProfile} />
      </div>
    )
  }
}

export const ChatMessage = ({
  partial = false,
  message,
  student,
  studentProfile,
  setStudentProfile
}: ChatMesssageParams) => {
  const { role, content } = message

  if (partial == true || content === null || content === undefined) {
    const partialOutput = advisorAgentSchema.safeParse({
      advisor_output: content
    })
    if (!partialOutput.success) {
      return (
        <p>
          <strong>Partial Assistant:</strong> Error parsing partial output{" "}
          {JSON.stringify(partialOutput?.error)}
        </p>
      )
    } else {
      return (
        <MessageBody
          advisor_output={partialOutput.data.advisor_output}
          studentProfile={studentProfile}
          setStudentProfile={setStudentProfile}
          student={student}
        />
      )
    }
  }

  if (role === "user") {
    return (
      <p>
        <strong>User:</strong> {content}
      </p>
    )
  }

  return (
    <MessageBody
      advisor_output={content}
      studentProfile={studentProfile}
      setStudentProfile={setStudentProfile}
      student={student}
    />
  )
}

const MessageBody = ({
  advisor_output,
  ...params
}: {
  advisor_output: AdvisorAgent["advisor_output"]
  studentProfile: StudentProfile
  setStudentProfile: (profile: StudentProfile) => void
  student: User
}) => {
  return (
    <>
      <p>
        <strong>Assistant:</strong> {advisor_output.response}
        <br />
        <small className="text-gray-500">
          {advisor_output.actions.map(action => action.type).join(", ")}
        </small>
      </p>
      <div>
        {advisor_output.actions.map((action, i) => {
          const Handler = chatMessageHandler[action.type]

          return (
            <Handler
              key={i}
              // @ts-expect-error
              advisor_output={action}
              studentProfile={params.studentProfile}
              setStudentProfile={params.setStudentProfile}
              student={params.student}
            />
          )
        })}
      </div>
    </>
  )
}
