"use client"

import * as React from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"
import { cn } from "@ui/lib/utils"

const Popover = PopoverPrimitive.Root

const PopoverTrigger = PopoverPrimitive.Trigger

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content> & { blank?: boolean }
>(({ className, blank = false, align = "center", sideOffset = 4, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        {
          "z-50 items-center rounded-md border border-stone-200 bg-white shadow-md animate-in fade-in-20 slide-in-from-top-1":
            !blank
        },
        className
      )}
      onWheel={e => {
        e.stopPropagation()

        const isScrollingDown = e.deltaY > 0

        if (isScrollingDown) {
          // Simulate arrow down key press
          e.currentTarget.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown" }))
        } else {
          // Simulate arrow up key press
          e.currentTarget.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp" }))
        }
      }}
      {...props}
    />
  </PopoverPrimitive.Portal>
))
PopoverContent.displayName = PopoverPrimitive.Content.displayName

export { Popover, PopoverTrigger, PopoverContent }
