import React from "react"
import { Button } from "@ui/components/ui/button"
import { Input, InputProps } from "@ui/components/ui/input"
import { cn } from "@ui/lib/utils"
import { Loader2 } from "lucide-react"

import { AnimatedBorderWrapper } from "./animated-border-wrapper"

export interface PromptComposerProps {
  prompt: string
  onChange: (event: string) => void
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
    <div className="fixed bottom-0 p-4 w-full">
      <AnimatedBorderWrapper enabled={animatedLoading && loading} className={cn(className)}>
        <div className="flex h-auto flex-row items-center relative w-full gap-4">
          <Input
            {...inputProps}
            disabled={loading}
            autoFocus
            onChange={event => onChange(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder ?? "Ask me anything..."}
            value={prompt}
            className={cn(
              "border-foreground text-foreground focus:z-100 placeholder:text-foreground/70 relative flex h-11 rounded-full bg-background py-3 pr-[52px] text-sm outline-none disabled:cursor-not-allowed disabled:opacity-[1] disabled:bg-muted disabled:placeholder-text-foreground/50 disabled:text-foreground/50",
              {
                "placeholder:text-lg py-6": jumbo,
                "border-purps": loading
              }
            )}
          />
          {loading && onCancel ? (
            <Button size="sm" onClick={onCancel} className="absolute right-0 m-2 rounded-full">
              Stop Generating
            </Button>
          ) : (
            <Button size="lg" disabled={loading} onClick={() => onSubmit(prompt)}>
              {loading ? (
                <Loader2 className="absolute right-0 m-2 rounded-full animate-spin" />
              ) : (
                "Ask"
              )}
            </Button>
          )}
        </div>
      </AnimatedBorderWrapper>
    </div>
  )
}
