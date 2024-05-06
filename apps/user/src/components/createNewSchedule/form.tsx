"use client"

import { useRouter } from "next/navigation"
import { UniversityPrograms } from "@/types"
import { zodResolver } from "@hookform/resolvers/zod"
import { MultiSelect, Option } from "@repo/ui/components/multiselect"
import { Button } from "@repo/ui/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@repo/ui/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@ui/components/ui/select"
import { Loader2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { createNewSchedule } from "./action"

// export const programs = [
//   {
//     value: "CS",
//     label: "Computer Science"
//   },
//   {
//     value: "DS",
//     label: "Data Science"
//   }
// ]

export function CreateNewScheduleForm({
  userId,
  universityPrograms
}: {
  userId: string
  universityPrograms: UniversityPrograms[]
}) {
  const universities = universityPrograms.map(university => ({
    value: university.name,
    label: university.name
  }))

  const programs = universityPrograms
    .map(university =>
      university.Program.map(program => ({
        value: program.id,
        label: program.name,
        id: university.id,
        universityId: university.name
      }))
    )
    .flat()

  const years = ["2021", "2022", "2023", "2024", "2025"]
  const semesters = ["Fall", "Spring"]

  const enumValues = universities.map(university => university.value)
  const formSchema = z.object({
    university: z.enum(enumValues as [string, ...string[]]),
    programs: z.array(z.custom<Option>()).min(1),
    start: z.string()
  })

  const { formState, getValues, trigger, setError, ...form } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      programs: [],
      university: "",
      start: ""
    }
  })

  const router = useRouter()

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const result = formSchema.safeParse(values)

    if (!result.success) {
      setError("root", {
        message: "Error Parsing"
      })
      return
    }
    console.log(result.data.programs)
    if (result.data.university !== "University of South Florida") {
      setError("university", {
        message: "We only support University of South Florida at the moment"
      })
      return
    }

    const scheduleId = await createNewSchedule(
      userId,
      result.data.programs.map(option => option.value),
      result.data.start
    )

    router.push(`/schedule/${scheduleId}`)
  }

  const programsForUniversity = (university: string) => {
    return programs.filter(program => program.universityId === university)
  }

  return (
    <Form
      trigger={trigger}
      getValues={getValues}
      setError={setError}
      formState={formState}
      {...form}
    >
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="university"
          render={({ field }) => (
            <FormItem>
              <FormLabel>University</FormLabel>
              <Select
                onValueChange={e => {
                  // clear the options
                  form.setValue("programs", [])
                  field.onChange(e)
                }}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a University" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {universities.map(university => (
                    <SelectItem key={university.value} value={university.value}>
                      {university.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="programs"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Majors</FormLabel>
              <MultiSelect
                name={field.name}
                onChange={field.onChange}
                value={field.value}
                options={programsForUniversity(getValues().university)}
                closeOnSelect
                trigger={trigger}
                placeholder="Select your majors"
              />
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="start"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Starting Semester</FormLabel>
              <Select defaultValue={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a starting semester" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {years.map(year =>
                    semesters.map(s => (
                      <SelectItem key={`${year}-${s}`} value={`${year} ${s}`}>
                        {year} {s}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={!formState.isValid || formState.isSubmitting}>
          <>
            {formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit
          </>
        </Button>
      </form>
    </Form>
  )
}
