"use client"

import * as React from "react"
import { useAtBottom } from "@ui/hooks/use-at-bottom"
import { useInView } from "react-intersection-observer"

interface ChatScrollAnchorProps {
	trackVisibility?: boolean
	scrollerRef: React.RefObject<HTMLDivElement>
}

export function ChatScrollAnchor({ trackVisibility, scrollerRef }: ChatScrollAnchorProps) {
	const isAtBottom = useAtBottom({ scrollerRef, offset: 100 })
	const previousVisibility = React.useRef<boolean>(false)

	const { ref, inView } = useInView({
		trackVisibility,
		delay: 100,
		root: scrollerRef?.current,
		rootMargin: "0px 0px 100px 0px",
		threshold: 0
	})

	React.useEffect(() => {
		const shouldBeWatching = trackVisibility || previousVisibility.current
		const shouldScrollToBottom = isAtBottom && shouldBeWatching && !inView

		if (shouldScrollToBottom) {
			scrollerRef?.current?.scrollTo({
				top: scrollerRef?.current?.scrollHeight,
				behavior: "smooth"
			})
		}

		previousVisibility.current = trackVisibility || false
	}, [inView, isAtBottom, trackVisibility, scrollerRef])

	return <div ref={ref} className="h-px w-full" />
}
