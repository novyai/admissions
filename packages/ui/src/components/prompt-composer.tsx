import React, { useState } from "react"
import { Button } from "@ui/components/ui/button"
import { Input, InputProps } from "@ui/components/ui/input"
import { cn } from "@ui/lib/utils"
import { Loader2 } from "lucide-react"

import { AnimatedBorderWrapper } from "./animated-border-wrapper"

export interface PromptComposerProps {
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
  placeholder,
  onSubmit,
  onCancel,
  loading = false,
  animatedLoading = true,
  inputProps = {},
  jumbo = false,
  className
}: PromptComposerProps) {
  const [prompt, setPrompt] = useState<string>("")

  const _onSubmit = (value: string) => {
    onSubmit(value)
    setPrompt("")
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === "Enter") {
      event.preventDefault()
      _onSubmit(prompt)
    }
  }

  return (
    <AnimatedBorderWrapper enabled={animatedLoading && loading} className={cn(className)}>
      <div className="flex h-auto flex-row items-center relative w-full gap-4">
        <Input
          {...inputProps}
          disabled={loading}
          autoFocus
          onChange={event => setPrompt(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? "Ask me anything..."}
          value={prompt}
          className={cn(
            "focus:z-100 placeholder:text-foreground/70 relative flex h-11 bg-background py-3 pr-[52px] text-sm outline-none disabled:cursor-not-allowed disabled:opacity-[1] disabled:bg-muted disabled:placeholder-text-foreground/50 disabled:text-foreground/50",
            {
              "placeholder:text-lg py-6": jumbo
            }
          )}
        />
        {loading && onCancel ?
          <Button size="lg" onClick={onCancel} className="m-2">
            Stop Generating
          </Button>
        : <Button size="lg" disabled={loading} onClick={() => _onSubmit(prompt)}>
            {loading ?
              <Loader2 className="m-2 animate-spin" />
            : "Ask"}
          </Button>
        }
      </div>
    </AnimatedBorderWrapper>
  )
}
