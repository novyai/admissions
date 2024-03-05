import * as React from "react"

// @ts-ignore
export function useAtBottom({ scrollerRef, offset = 0 }): boolean {
	const [isAtBottom, setIsAtBottom] = React.useState<boolean>(false)

	React.useEffect(() => {
		const handleScroll = () => {
			if (!scrollerRef?.current) return
			const { scrollTop, scrollHeight, clientHeight } = scrollerRef.current
			setIsAtBottom(scrollTop >= scrollHeight - clientHeight - offset)
		}

		// Attach the event listener to the scroller element instead of the window
		const scroller = scrollerRef?.current
		if (scroller) {
			scroller.addEventListener("scroll", handleScroll, { passive: true })
		}
		handleScroll()

		return () => {
			if (scroller) {
				scroller.removeEventListener("scroll", handleScroll)
			}
		}
	}, [offset, scrollerRef])

	return isAtBottom
}
