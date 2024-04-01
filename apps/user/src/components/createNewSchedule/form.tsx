"use client"

import { useRouter } from "next/navigation"
import { Program } from "@graph/defaultCourses"
import { zodResolver } from "@hookform/resolvers/zod"
import { MultiSelect, Option } from "@ui/components/multiselect"
import { Button } from "@ui/components/ui/button"
import { Form, FormField, FormItem, FormLabel, FormMessage } from "@ui/components/ui/form"
import { Loader2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { createNewSchedule } from "./action"

export const programs = [
  {
    value: "CS",
    label: "Computer Science"
  },
  {
    value: "DS",
    label: "Data Science"
  }
]

const formSchema = z.object({
  options: z.array(z.custom<Option>()).min(1)
})

export function CreateNewScheduleForm({ userId }: { userId: string }) {
  const { formState, trigger, ...form } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      options: []
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
      result.data.options.map(option => option.value as Program)
    )
    router.push(`/schedule/${scheduleId}`)
  }

  return (
    <Form trigger={trigger} formState={formState} {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="options"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{field.name}</FormLabel>
              <MultiSelect
                options={programs satisfies Option[]}
                {...field}
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
