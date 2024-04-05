"use client"

import * as React from "react"
import { Button } from "@repo/ui/components/ui/button"
import { ArrowDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { useAtBottom } from "@/hooks/use-at-bottom"

export function ScrollToBottom({
  scrollerRef,
  className
}: {
  scrollerRef: React.RefObject<HTMLDivElement>
  className?: string
}) {
  const isAtBottom = useAtBottom({ scrollerRef: scrollerRef, offset: 200 })

  return (
    <Button
      variant="outline"
      size="icon"
      className={cn(
        "absolute right-4 z-20 bg-background transition-opacity",
        className,
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
