"use client"

import { useState } from "react"
import { Button } from "@ui/components/ui/button"
import { Input } from "@ui/components/ui/input"

// chat bar pin to the bottom
export const ChatBottom = ({ onSend }: { onSend: (message: string) => void }) => {
  const [message, setMessage] = useState("")

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white shadow-md p-4">
      <div className="flex items-center gap-4">
        <Input
          type="text"
          placeholder="Type a message"
          onChange={e => setMessage(e.target.value)}
        />
        <Button onClick={() => onSend(message)}>Send</Button>
      </div>
    </div>
  )
}
