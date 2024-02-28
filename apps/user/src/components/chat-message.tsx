import React, { ReactNode } from "react"
import { AdvisorAgent, advisorAgentSchema } from "@/agents/advisor/schema"
import { User } from "@db/client"
import { StudentProfile } from "@graph/types"
import { cn } from "@ui/lib/utils"

import { CustomMessage } from "./chat"
import { MdxContent } from "./mdxContent"
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
      return null
    } else {
      return (
        <MessageWrapper message={message}>
          <AdvisorMessageBody
            advisor_output={partialOutput.data.advisor_output}
            studentProfile={studentProfile}
            setStudentProfile={setStudentProfile}
            student={student}
          />
        </MessageWrapper>
      )
    }
  }

  if (role === "user") {
    return (
      <MessageWrapper message={message}>
        <MdxContent content={message.content} />
      </MessageWrapper>
    )
  }

  return (
    <MessageWrapper message={message}>
      <AdvisorMessageBody
        advisor_output={content}
        studentProfile={studentProfile}
        setStudentProfile={setStudentProfile}
        student={student}
      />
    </MessageWrapper>
  )
}

export const MessageWrapper = React.memo(function MessageWrapper({
  children,
  className = "",
  message
}: {
  children: React.ReactNode
  className?: string
  message: Partial<CustomMessage>
}) {
  return (
    <div
      className={cn(`relative text-foreground/90`, className, {
        "bg-transparent dark:bg-transparent text-foreground/90": message.role === "assistant",
        "mx-0 flex pt-4": message.role === "user"
      })}
    >
      <div>
        <strong className="text-xs font-okineMedium tracking-widest text-accent-foreground">
          {message.role === "user" ? "YOU" : "Advisor"}
        </strong>
        <div
          className={cn("mt-2 pl-2", {
            "bg-[#e5dbff59] dark:bg-[#ad8eff7d] rounded-3xl border-2 border-accent py-2 px-4 flex gap-2":
              message.role === "user"
          })}
        >
          {children}
        </div>
      </div>
    </div>
  )
})

const AdvisorMessageBody = ({
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
      <MdxContent content={advisor_output.response} />
      <small className="text-gray-500">
        {advisor_output.actions?.map(action => action.type).join(", ")}
      </small>

      <div>
        {advisor_output?.actions?.map((action, i) => {
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
