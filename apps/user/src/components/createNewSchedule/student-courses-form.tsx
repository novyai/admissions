import { StudentInfo } from "@/app/(app)/create/create-forms"
import { SemesterYearType } from "@graph/types"
import { zodResolver } from "@hookform/resolvers/zod"
import { Option } from "@repo/ui/components/multiselect"
import { Button } from "@ui/components/ui/button"
import { Form, FormField, FormItem, FormLabel } from "@ui/components/ui/form"
import { Loader2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { calculateSemesterDifference, getSemesterCode } from "@/lib/schedule/utils"
import { capitalize } from "@/lib/utils"

import { CourseSearchMultiSelect } from "./course-search-multiselect"

export type CoursesInfo = { [semesterIndex: string]: Option[] }

const getSemesterLabels = (semesterYearStart: SemesterYearType) => {
  let semesterLabels: SemesterYearType[] = []

  const numSemestersUntilPresent = calculateSemesterDifference(semesterYearStart)

  for (let i = 0; i < numSemestersUntilPresent; i++) {
    semesterLabels.push(getSemesterCode(i, semesterYearStart))
  }
  return semesterLabels
}

export default function StudentCoursesForm({
  studentInfo,
  handleSubmit
}: {
  studentInfo?: StudentInfo
  handleSubmit: (courses: CoursesInfo) => void
}) {
  if (studentInfo === undefined) {
    throw Error("studentInfo is undefined")
  }

  const semesterYearOptions = getSemesterLabels(studentInfo.start)

  const defaultFormValues: { [semesterIndex: string]: Option[] } = {}
  for (let i = 0; i < semesterYearOptions.length; i++) {
    defaultFormValues[i.toString()] = []
  }

  const formSchema = z.record(z.string(), z.array(z.custom<Option>()).min(1))
  const { formState, getValues, setValue, trigger, setError, ...form } = useForm<
    z.infer<typeof formSchema>
  >({
    resolver: zodResolver(formSchema),
    defaultValues: defaultFormValues
  })

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    const result = formSchema.safeParse(values)
    if (!result.success) {
      setError("root", {
        message: "Error Parsing"
      })
      return
    }
    handleSubmit(result.data)
  }

  return (
    <Form
      setValue={setValue}
      trigger={trigger}
      getValues={getValues}
      setError={setError}
      formState={formState}
      {...form}
    >
      <form onSubmit={form.handleSubmit(onSubmit)}>
        {semesterYearOptions.map(({ semester, year }, i) => (
          <FormField
            key={i}
            control={form.control}
            name={i.toString()}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{`${capitalize(semester)} ${year}`}</FormLabel>
                <CourseSearchMultiSelect
                  name={field.name}
                  value={field.value}
                  placeholder="Select courses"
                  handleSetValue={courseOption => {
                    setValue(field.name, courseOption, { shouldValidate: true })
                  }}
                />
              </FormItem>
            )}
          />
        ))}
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
