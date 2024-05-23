import { useEffect, useState } from "react"
import { Option } from "@ui/components/multiselect"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "@ui/components/ui/command"
import { Loader2 } from "lucide-react"
import { useDebouncedCallback } from "use-debounce"

import { searchCourses } from "./action"

export default function CourseSearchCommand({
  handleSetValue
}: {
  handleSetValue: (courseOption: Option) => void
}) {
  const [courses, setCourses] = useState<Option[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")

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

  useEffect(() => {
    getDebouncedCourses()
  }, [search, getDebouncedCourses])

  return (
    <Command>
      <CommandInput
        placeholder={loading ? "Loading..." : "Search courses..."}
        value={search}
        onValueChange={setSearch}
      />
      {loading && (
        <div className="flex w-full min-w-full items-center gap-2 p-4">
          <Loader2 className="h-3 w-3 animate-spin" />
          <small className="text-xs">fetching courses...</small>
        </div>
      )}
      <CommandList>
        <CommandEmpty>No courses found.</CommandEmpty>
        <CommandGroup>
          {courses.map(course => (
            <CommandItem
              key={course.value}
              value={course.label}
              onSelect={() => {
                handleSetValue(course)
              }}
            >
              {course.label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  )
}
