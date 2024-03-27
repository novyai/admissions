"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { MultiSelect, Option } from "@ui/components/multiselect"
import { Button } from "@ui/components/ui/button"
import {
  Form,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@ui/components/ui/form"
import { useForm } from "react-hook-form"
import { z } from "zod"

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

  // 2. Define a submit handler.
  function onSubmit(values: z.infer<typeof formSchema>) {
    // Do something with the form values.
    // ✅ This will be type-safe and validated.
    console.log(values)
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
