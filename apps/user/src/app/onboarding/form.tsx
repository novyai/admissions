"use client"

import { useRouter } from "next/navigation"
import { Program } from "@graph/defaultCourses"
import { zodResolver } from "@hookform/resolvers/zod"
import { MultiSelect, Option } from "@ui/components/multiselect"
import { Button } from "@ui/components/ui/button"
import { Form, FormField, FormItem, FormLabel, FormMessage } from "@ui/components/ui/form"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { createFirstScheduleAndVersion } from "./action"

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
  options: z.array(z.custom<Option>())
})

export function OnboardingForm({ userId }: { userId: string }) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      options: []
    }
  })

  const router = useRouter()

  // 2. async Define a submit handler.
  async function onSubmit(values: z.infer<typeof formSchema>) {
    const programs = values.options.map(option => option.value)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const isValidProgram = (program: any): program is Program =>
      Object.values(Program).includes(program)
    const validPrograms: Program[] = programs.filter(isValidProgram)

    await createFirstScheduleAndVersion(userId, validPrograms)
    router.push("/dag")
  }

  return (
    <Form {...form}>
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
                trigger={form.trigger}
                placeholder="Select your majors"
              />
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  )
}
