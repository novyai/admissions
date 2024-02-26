"use client"

import { User } from "@db/client"

import { ChatBottom } from "./chat-bar"

export function Chat({ student }: { student: User }) {
  return (
    <div>
      <p>{`Chat for student ${student.studentId}`}</p>
      <ChatBottom onSend={console.log} />
    </div>
  )
}
