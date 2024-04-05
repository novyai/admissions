import React from "react"
import { advisorAgentSchema } from "@ai/agents/advisor/schema"
import { User } from "@repo/db"
import { StudentProfile } from "@repo/graph/types"
import { cn } from "@ui/lib/utils"

import { AdvisorMessageBody } from "./advisor-chat"
import { CustomMessage } from "./chat"
import { MdxContent } from "./mdxContent"

type ChatMessageParams = {
  partial?: boolean
  student: User
  studentProfile: StudentProfile
  setStudentProfile: (profile: StudentProfile) => void
  message: CustomMessage
}
export const ChatMessage = ({
  partial = false,
  message,
  student,
  studentProfile,
  setStudentProfile
}: ChatMessageParams) => {
  const { role, content } = message

  if (partial == true || content === null || content === undefined) {
    const partialOutput = advisorAgentSchema.safeParse({
      advisor_output: content
    })
    if (!partialOutput.success) {
      return null
    } else {
      return (
        <MessageWrapper role={message.role}>
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
      <MessageWrapper role={message.role}>
        <MdxContent content={message.content} />
      </MessageWrapper>
    )
  }

  return (
    <MessageWrapper role={message.role}>
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
  role
}: {
  children: React.ReactNode
  className?: string
  role: CustomMessage["role"]
}) {
  return (
    <div
      className={cn(`relative text-foreground/90`, className, {
        "bg-transparent dark:bg-transparent text-foreground/90": role === "assistant",
        "mx-0 flex pt-4": role === "user"
      })}
    >
      <div>
        <strong className="text-xs font-semibold tracking-widest text-accent-foreground">
          {role === "user" ? "YOU" : "Advisor"}
        </strong>
        <div
          className={cn("mt-2 pl-2", {
            "bg-[#e5dbff59] dark:bg-[#ad8eff7d] rounded-3xl border-2 border-accent py-2 px-4 flex gap-2":
              role === "user"
          })}
        >
          {children}
        </div>
      </div>
    </div>
  )
})
