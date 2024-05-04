import { StudentInfo } from "@/app/(app)/create/create-forms"
import { UniversityPrograms } from "@/types"
import { Program } from "@graph/defaultCourses"
import { Semester, SemesterEnum } from "@graph/types"
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

import { capitalize } from "@/lib/utils"

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

export function StudentInfoForm({
  universityPrograms,
  yearStartOptions,
  handleSubmit
}: {
  universityPrograms: UniversityPrograms[]
  yearStartOptions: number[]
  handleSubmit: (studentInfo: StudentInfo) => void
}) {
  const semesterOptions: Semester[] = ["FALL", "SPRING"]
  const universities = universityPrograms.map(university => ({
    value: university.id,
    label: university.name
  }))

  const programs = universityPrograms
    .map(university =>
      university.Program.map(program => ({
        value: program.department.code,
        label: program.name,
        universityId: university.id
      }))
    )
    .flat()

  const formSchema = z.object({
    universityId: z.string(),
    majors: z.array(z.custom<Option>()).min(1),
    semesterStart: SemesterEnum,
    yearStart: z.string()
  })

  const { formState, getValues, trigger, setError, ...form } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      majors: [],
      universityId: undefined,
      semesterStart: undefined,
      yearStart: undefined
    }
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const result = formSchema.safeParse(values)
    if (!result.success) {
      setError("root", {
        message: "Error Parsing"
      })
      return
    }
    const usf = universities.find(university => university.label == "University of South Florida")
    if (result.data.universityId !== usf?.value) {
      setError("universityId", {
        message: "We only support University of South Florida at the moment"
      })
      return
    }
    handleSubmit({
      universityId: result.data.universityId,
      majors: result.data.majors.map(option => option.value as Program),
      start: {
        semester: result.data.semesterStart,
        year: parseInt(result.data.yearStart)
      }
    })
  }

  const programsForUniversity = () => {
    const universityId = getValues().universityId
    return programs.filter(program => program.universityId === universityId)
  }

  return (
    <>
      <p className="mb-2">Let&apos;s get you started!</p>
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
            name="universityId"
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
                  options={programsForUniversity()}
                  closeOnSelect
                  trigger={trigger}
                  placeholder="Select your majors"
                />
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex gap-4">
            <FormField
              control={form.control}
              name="semesterStart"
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
                      {semesterOptions.map(semester => (
                        <SelectItem key={semester} value={semester}>
                          {capitalize(semester)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            ></FormField>
            <FormField
              control={form.control}
              name="yearStart"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Starting Year</FormLabel>
                  <Select
                    defaultValue={field.value?.toString() ?? ""}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a starting year" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {yearStartOptions.map(year => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <Button type="submit" disabled={!formState.isValid || formState.isSubmitting}>
            <>
              {formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit
            </>
          </Button>
        </form>
      </Form>
    </>
  )
}
