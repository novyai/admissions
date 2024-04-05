"use client"

import { useEffect, useState } from "react"
import { Button } from "@repo/ui/components/ui/button"
import { Dialog, DialogContent } from "@repo/ui/components/ui/dialog"
import { Sparkles } from "lucide-react"

// import { Chat } from "./chat"

export function StudentCommand() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen(open => !open)
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  return (
    <>
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={() => setOpen(true)} className="gap-2">
          <Sparkles className="h-3 w-3" />
          AI Advisor
        </Button>
        <p className="text-sm text-muted-foreground">
          <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
            <span className="text-xs">⌘</span>k
          </kbd>
        </p>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden">
          {/* <Chat studentId={studentId} /> */}
        </DialogContent>
      </Dialog>
    </>
  )
}
