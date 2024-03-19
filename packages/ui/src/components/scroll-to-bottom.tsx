"use client"

import * as React from "react"
import { Button } from "@ui/components/ui/button"
import { useAtBottom } from "@ui/hooks/use-at-bottom"
import { cn } from "@ui/lib/utils"
import { ArrowDown } from "lucide-react"

export function ScrollToBottom({ scrollerRef }: { scrollerRef: React.RefObject<HTMLDivElement> }) {
  const isAtBottom = useAtBottom({ scrollerRef: scrollerRef, offset: 200 })

  return (
    <Button
      variant="outline"
      size="icon"
      className={cn(
        "absolute right-4 top-[-48px] z-20 bg-background transition-opacity",
        isAtBottom ? "opacity-0" : "opacity-100"
      )}
      onClick={() =>
        scrollerRef?.current?.scrollTo({
          top: scrollerRef?.current?.scrollHeight,
          behavior: "smooth"
        })
      }
    >
      <ArrowDown />
      <span className="sr-only">Scroll to bottom</span>
    </Button>
  )
}
