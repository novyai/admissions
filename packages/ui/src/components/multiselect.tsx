"use client"

import * as React from "react"
import { Badge } from "@ui/components/ui/badge"
import { Command, CommandGroup, CommandItem } from "@ui/components/ui/command"
import { Command as CommandPrimitive } from "cmdk"
import { X } from "lucide-react"
import { ControllerRenderProps, FieldValues, UseFormTrigger } from "react-hook-form"

export type Option = Record<"value" | "label", string>

type MultiSelectProps<T extends FieldValues> = Omit<ControllerRenderProps<T>, "ref" | "onBlur"> & {
  options: Option[]
  value: Option[]
  className?: string
  placeholder: string
  closeOnSelect?: boolean
  trigger: UseFormTrigger<T>
}

export function MultiSelect<T extends FieldValues>({
  options,
  value: selected,
  onChange,
  closeOnSelect = false,
  placeholder,
  trigger,
  name
}: MultiSelectProps<T>) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState("")

  const handleUnselect = React.useCallback(
    (option: Option) => {
      const newSelected = [...selected.filter((s: Option) => s.value !== option.value)]
      onChange(newSelected)
      trigger(name)
    },
    [name, onChange, selected, trigger]
  )

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const input = inputRef.current
      if (input) {
        if (e.key === "Delete" || e.key === "Backspace") {
          if (input.value === "") {
            const newSelected = [...selected]
            newSelected.pop()
            onChange(newSelected)
          }
        }
        // This is not a default behaviour of the <input /> field
        if (e.key === "Escape") {
          input.blur()
        }
      }
    },
    [onChange, selected]
  )

  const selectables = options.filter(option => !selected.includes(option))

  return (
    <Command onKeyDown={handleKeyDown} className="overflow-visible bg-transparent">
      <div className="group border border-input px-3 py-2 text-sm ring-offset-background rounded-md focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
        <div className="flex gap-1 flex-wrap">
          {selected.map((selectedValue: Option) => {
            return (
              <Badge key={selectedValue.value} variant="secondary">
                {selectedValue.label}
                <button
                  className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  onKeyDown={e => {
                    if (e.key === "Enter") {
                      handleUnselect(selectedValue)
                    }
                  }}
                  onMouseDown={e => {
                    e.preventDefault()
                    e.stopPropagation()
                  }}
                  onClick={() => handleUnselect(selectedValue)}
                >
                  <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                </button>
              </Badge>
            )
          })}
          {/* Avoid having the "Search" Icon */}
          <CommandPrimitive.Input
            ref={inputRef}
            value={inputValue}
            onValueChange={setInputValue}
            onBlur={() => setOpen(false)}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            className="ml-2 bg-transparent outline-none placeholder:text-muted-foreground flex-1"
          />
        </div>
      </div>
      <div className="relative mt-2">
        {open && selectables.length > 0 ?
          <div className="absolute w-full z-10 top-0 rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in">
            <CommandGroup className="h-full overflow-auto">
              {selectables.map(option => {
                return (
                  <CommandItem
                    key={option.value}
                    onMouseDown={e => {
                      e.preventDefault()
                      e.stopPropagation()
                    }}
                    onSelect={_value => {
                      setInputValue("")
                      onChange([...selected, option])
                      trigger(name)
                      if (closeOnSelect) {
                        setOpen(false)
                      }
                    }}
                    className={"cursor-pointer"}
                  >
                    {option.label}
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </div>
        : null}
      </div>
    </Command>
  )
}
