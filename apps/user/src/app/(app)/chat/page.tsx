import { NewConversation } from "@/components/new-conversation"

export default async function Page() {
  return (
    <div className="h-[calc(100dvh-64px)] overflow-hidden flex-1">
      <NewConversation />
    </div>
  )
}
