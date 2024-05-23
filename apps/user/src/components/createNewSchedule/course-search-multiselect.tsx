import * as React from "react"
import { Badge } from "@ui/components/ui/badge"
import { Command, CommandGroup, CommandItem } from "@ui/components/ui/command"
import { CommandList, Command as CommandPrimitive } from "cmdk"
import { Loader2, X } from "lucide-react"
import { useDebouncedCallback } from "use-debounce"

import { searchCourses } from "./action"

export type Option = Record<"value" | "label", string>

type CourseSearchMultiSelectProps = {
  handleSetValue: (courseOptions: Option[]) => void
  value: Option[]
  name: string
  className?: string
  placeholder: string
  closeOnSelect?: boolean
}

export function CourseSearchMultiSelect({
  value,
  handleSetValue,
  closeOnSelect = false,
  placeholder
}: CourseSearchMultiSelectProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [open, setOpen] = React.useState(false)
  const [courses, setCourses] = React.useState<Option[]>([])
  const [loading, setLoading] = React.useState(false)
  const [search, setSearch] = React.useState("")

  const getDebouncedCourses = useDebouncedCallback(async () => {
    setLoading(true)
    try {
      const courseSearchResults = await searchCourses(search)
      setCourses(
        courseSearchResults.map(c => ({
          value: c.id,
          label: `${c.courseSubject} ${c.courseNumber} ${c.name}`
        }))
      )
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, 500)

  React.useEffect(() => {
    getDebouncedCourses()
    console.log("in use effect")
  }, [search, getDebouncedCourses])

  const handleUnselect = React.useCallback(
    (option: Option) => {
      const newSelected = [...value.filter((s: Option) => s.value !== option.value)]
      handleSetValue(newSelected)
    },
    [handleSetValue, value]
  )

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const input = inputRef.current
      if (input) {
        if (e.key === "Delete" || e.key === "Backspace") {
          if (input.value === "") {
            const newSelected = [...value]
            newSelected.pop()
            handleSetValue(newSelected)
          }
        }
        // This is not a default behaviour of the <input /> field
        if (e.key === "Escape") {
          input.blur()
        }
      }
    },
    [handleSetValue, value]
  )

  const selectables = courses.filter(
    course => !value.map(option => option.value).includes(course.value)
  )

  return (
    <Command onKeyDown={handleKeyDown} className="overflow-visible bg-transparent">
      <div className="group border border-input px-3 py-2 text-sm ring-offset-background rounded-md focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
        <div className="flex gap-1 flex-wrap">
          {value.map((selectedValue: Option) => {
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
            value={search}
            onValueChange={setSearch}
            onBlur={() => setOpen(false)}
            onFocus={() => setOpen(true)}
            placeholder={courses.length === 0 ? placeholder : ""}
            className="ml-2 bg-transparent outline-none placeholder:text-muted-foreground flex-1"
          />
        </div>
      </div>
      <div className="relative mt-2 h-full">
        {open ?
          <div className="absolute w-full z-10 top-0 rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in">
            <CommandList>
              {loading && (
                <div className="flex w-full min-w-full items-center gap-2 p-4">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <small className="text-xs">fetching courses...</small>
                </div>
              )}
              {!loading && selectables.length === 0 && (
                <div className="flex w-full min-w-full items-center gap-2 p-4">
                  <small>{search === "" ? "Search for a course name." : "No courses found"}</small>
                </div>
              )}
              <CommandGroup className="h-fit max-h-[30vh] overflow-auto">
                {selectables.map(option => {
                  return (
                    <CommandItem
                      key={option.value}
                      onMouseDown={e => {
                        e.preventDefault()
                        e.stopPropagation()
                      }}
                      onSelect={_value => {
                        setSearch("")
                        handleSetValue([...value, option])
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
            </CommandList>
          </div>
        : null}
      </div>
    </Command>
  )
}
