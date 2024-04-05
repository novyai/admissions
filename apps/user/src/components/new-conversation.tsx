"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createConversationForUser } from "@/actions/conversation"
import { useAppContext } from "@/app/providers"
import { Button } from "@ui/components/ui/button"
import { Loader2 } from "lucide-react"

export function NewConversation() {
  const [loading, setLoading] = useState(false)
  const { data } = useAppContext()
  const router = useRouter()

  async function newConvo() {
    setLoading(true)

    if (!data.user) {
      setLoading(false)
      return
    }

    const newConversation = await createConversationForUser({ userId: data.user?.id })
    router.push(`/chat/${newConversation.id}`)
  }

  return (
    <div className="h-[calc(100dvh-64px)] overflow-hidden flex-1 flex justify-center items-center">
      <Button onClick={newConvo}>
        {loading ?
          <>
            <Loader2 className="animate-spin h-4 w-4" />
          </>
        : "New conversation"}
      </Button>
    </div>
  )
}
