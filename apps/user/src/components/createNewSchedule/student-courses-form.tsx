"use client"

export default function StudentCoursesForm({
  selectedFormIndex,
  formIndex
}: {
  selectedFormIndex: number
  formIndex: number
}) {
  return formIndex === selectedFormIndex ? <p>Placeholder form</p> : <></>

  // const formSchema = z.object({
  //   courses: z.array(z.custom<Option>()).min(1)
  // })
}
