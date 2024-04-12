import { ReactElement } from "react"
import { ChatBubbleIcon } from "@radix-ui/react-icons"
import { PopoverArrow, PopoverContent, PopoverPortal } from "@radix-ui/react-popover"
import { Popover, PopoverTrigger } from "@repo/ui/components/ui/popover"

interface ChatPopoverProps {
  toggleOpen: () => void
  open: boolean
  children: ReactElement
  scrollToEnd: ({ now }: { now?: boolean }) => void
}

export function ChatPopover({ children, open, toggleOpen, scrollToEnd }: ChatPopoverProps) {
  return (
    <Popover
      open={open}
      onOpenChange={open => {
        if (open) {
          setTimeout(() => {
            scrollToEnd({})
          }, 500)
        }
      }}
    >
      <PopoverTrigger asChild>
        <button
          className="absolute top-2 right-2 flex items-center gap-1 p-2 border rounded-full shadow bg-[white]"
          aria-label="Chat"
          onClick={toggleOpen}
        >
          <ChatBubbleIcon />{" "}
          <span className="uppercase tracking-wide text-slate-600 text-sm font-semibold">Chat</span>
        </button>
      </PopoverTrigger>
      <PopoverPortal>
        <PopoverContent className="mr-6 h-[70vh] w-[28rem]">
          {children} <PopoverArrow className="fill-slate-600" />
        </PopoverContent>
      </PopoverPortal>
    </Popover>
  )
}
