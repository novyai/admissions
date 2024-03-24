import React from "react"
import { cn } from "@ui/lib/utils"

export const AnimatedBorderWrapper = ({
  children,
  enabled,
  strokeWidth = 3,
  className
}: {
  children: React.ReactNode
  enabled: boolean
  strokeWidth?: number
  className?: string
}) => {
  if (!enabled) return <>{children}</>

  return (
    <div
      className={cn(
        `rounded-md w-full min-w-full group shadow-xl relative overflow-hidden transition-all duration-300 ease-in-out bg-gradient-to-r from-cheese to-grass`,
        {
          "className": !!className,
          "p-[4px]": strokeWidth === 4,
          "p-[3px]": strokeWidth === 3,
          "p-[2px]": strokeWidth === 2,
          "p-[1px]": strokeWidth === 1
        }
      )}
    >
      <div className="animate-spin-slow absolute -top-[1200%] -bottom-[1200%] left-[30%] right-[30%] bg-gradient-to-r from-transparent via-gray-100/80 to-transparent visible"></div>
      <div className=" relative z-50 h-full w-full">{children}</div>
    </div>
  )
}
