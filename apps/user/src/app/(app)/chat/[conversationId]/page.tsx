import { notFound } from "next/navigation"
import { getConversationById } from "@repo/db/queries/conversation"

import { Assistant } from "@/components/assistant"

export default async function Page({
  params
}: {
  params: {
    conversationId: string
  }
}) {
  const conversation = await getConversationById({
    id: params.conversationId
  })

  if (!conversation) {
    return notFound()
  }

  return (
    <div className="h-[calc(100dvh-64px)] overflow-hidden flex-1">
      <Assistant conversation={{ ...conversation }} />
    </div>
  )
}
