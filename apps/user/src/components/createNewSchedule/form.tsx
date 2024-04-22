"use client"

import { useRouter } from "next/navigation"
import { UniversityPrograms } from "@/types"
import { Program } from "@graph/defaultCourses"
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
    value: university.id,
    label: university.name
  }))

  const programs = universityPrograms
    .map(university =>
      university.Program.map(program => ({
        value: program.id,
        label: program.name,
        universityId: university.id
      }))
    )
    .flat()

  const enumValues = universities.map(university => university.value)
  const formSchema = z.object({
    university: z.enum(enumValues as [string, ...string[]]),
    majors: z.array(z.custom<Option>()).min(1) // Assuming Option is a compatible type with any
  })

  const { formState, getValues, trigger, setError, ...form } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      majors: [],
      university: ""
    }
  })

  const router = useRouter()

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const result = formSchema.safeParse(values)

    if (!result.success) {
      return
    }

    const scheduleId = await createNewSchedule(
      userId,
      result.data.majors.map(option => option.value as Program)
    )

    router.push(`/schedule/${scheduleId}`)
  }

  const programsForUniversity = (universityId: string) => {
    return programs.filter(program => program.universityId === universityId)
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
                  form.setValue("majors", [])
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
          name="majors"
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
