import React from "react"
import { Button } from "@repo/ui/components/ui/button"
import { Input, InputProps } from "@repo/ui/components/ui/input"
import { cn } from "@ui/lib/utils"
import { Loader2 } from "lucide-react"

import { AnimatedBorderWrapper } from "./animated-border-wrapper"

export interface PromptComposerProps {
  prompt?: string
  onChange?: (event: string) => void
  onSubmit: (value: string) => void
  loading: boolean
  onCancel?: () => void
  animatedLoading?: boolean
  placeholder?: string
  inputProps?: InputProps
  jumbo?: boolean
  className?: string
}

/**
 * `PromptComposer` is a component that allows users to input prompts and submit them.
 *
 * @param {PromptComposerProps} props - The properties that define the component's behavior and display.
 *
 * @returns {React.ReactElement} The rendered `PromptComposer` component.
 */
export function PromptComposer({
  prompt = "",
  placeholder,
  onChange,
  onSubmit,
  onCancel,
  loading = false,
  animatedLoading = true,
  inputProps = {},
  jumbo = false,
  className
}: PromptComposerProps) {
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === "Enter") {
      event.preventDefault()
      onSubmit(prompt)
    }
  }

  return (
    <>
      <AnimatedBorderWrapper enabled={animatedLoading && loading} className={cn(className)}>
        <div className="flex h-auto flex-row items-center relative w-full">
          <div className="w-full">
            <Input
              {...inputProps}
              disabled={loading}
              autoFocus
              onChange={event => onChange && onChange((event.target as HTMLInputElement).value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder ?? "Ask me anything..."}
              value={prompt}
              className={cn(
                "border-2 border-foreground text-foreground focus:z-100 placeholder:text-foreground/70 relative flex h-11 w-full rounded-full bg-background py-3 pr-[52px] text-sm outline-none disabled:cursor-not-allowed disabled:opacity-[1] disabled:bg-muted disabled:placeholder-text-foreground/50 disabled:text-foreground/50",
                {
                  "text-lg placeholder:text-lg py-6 h-14": jumbo
                }
              )}
            />
          </div>
          <>
            <Button
              variant="secondary"
              size="lg"
              disabled={loading}
              onClick={() => onSubmit(prompt)}
              className="ml-[-88px] h-14 z-10"
            >
              {loading ?
                <Loader2 className="h-4 w-6 animate-spin" />
              : "Ask"}
            </Button>
          </>
        </div>
        {loading && onCancel && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onCancel}
            className="absolute right-0 mt-2"
          >
            Stop Generating
          </Button>
        )}
      </AnimatedBorderWrapper>
    </>
  )
}
