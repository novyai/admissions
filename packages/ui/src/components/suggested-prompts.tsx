import { Button } from "./ui/button"

interface SuggestedPromptsProps {
  prompts: string[]
  handleClick: (prompt: string) => void
}

export function SuggestedPrompts({ prompts, handleClick }: SuggestedPromptsProps) {
  return (
    <div className="absolute -top-11 left-2 flex gap-2">
      {prompts.map(prompt => (
        <Button
          key={prompt}
          className="py-1 px-2 rounded-lg shadow bg-background border border-slate-200 text-xs text-slate-700 hover:bg-blue-50 hover:border-blue-200"
          onClick={() => handleClick(prompt)}
        >
          {prompt}
        </Button>
      ))}
    </div>
  )
}
