"use client"

import * as React from "react"
import { useInView } from "react-intersection-observer"

interface ChatScrollAnchorProps {
  trackVisibility?: boolean
  scrollerRef: React.RefObject<HTMLDivElement>
}

export function ChatScrollAnchor({ trackVisibility, scrollerRef }: ChatScrollAnchorProps) {
  const [manualScroll, setManualScroll] = React.useState(false)
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const { ref, inView } = useInView({
    trackVisibility,
    delay: 100,
    root: scrollerRef?.current,
    rootMargin: "24px 0px 24px 0px",
    threshold: [0, 0.25, 0.5, 0.75, 1]
  })

  const onScroll = () => {
    setManualScroll(true)
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      setManualScroll(false)
    }, 1000)
  }

  React.useEffect(() => {
    const scoller = scrollerRef.current
    if (!scoller) return

    scoller.addEventListener("scroll", onScroll)

    return () => {
      scoller.removeEventListener("scroll", onScroll)
    }
  }, [scrollerRef])

  React.useEffect(() => {
    const shouldScrollToBottom = !manualScroll && !inView && trackVisibility

    if (shouldScrollToBottom) {
      scrollerRef?.current?.scrollTo({
        top: scrollerRef?.current?.scrollHeight,
        behavior: "smooth"
      })
    }
  }, [trackVisibility, scrollerRef, manualScroll, inView])

  return <div ref={ref} className="h-8 w-full" />
}
