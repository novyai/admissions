"use client"

import dynamic from "next/dynamic"
import { useRouter, useSearchParams } from "next/navigation"
import { Dialog, DialogContent } from "@repo/ui/components/ui/dialog"

function Modal({ children }: { children: React.ReactNode }) {
  const params = useSearchParams()
  const router = useRouter()
  const searchParams = new URLSearchParams(params.toString())

  return (
    <Dialog
      defaultOpen={true}
      onOpenChange={open => {
        if (!open) {
          searchParams.delete("showTranscript")
          router.push(`/students?${searchParams.toString()}`)
        }
      }}
    >
      <DialogContent className="max-w-2xl p-0">{children}</DialogContent>
    </Dialog>
  )
}

export const TranscriptModal = dynamic(() => Promise.resolve(Modal), {
  ssr: false
})
