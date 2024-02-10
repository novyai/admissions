import { getAllCourses } from "@/db/courses"

import { CoursesTable } from "@/components/courses-table"

export const revalidate = 0
export default async function Page({
  searchParams
}: {
  searchParams: {
    skip?: string
    take?: string
    q?: string
    orderBy?: {
      [key: string]: string
    }
  }
}) {
  const { skip, take, q, orderBy } = searchParams
  const filters = q?.length
    ? {
        OR: [
          {
            courseSubject: {
              contains: q
            }
          },
          {
            name: {
              contains: q
            }
          }
        ]
      }
    : undefined

  const { courses, total } = await getAllCourses({
    skip: parseInt(skip ?? "0"),
    take: parseInt(take ?? "50"),
    filters,
    orderBy
  })

  return (
    <>
      <div className="w-full h-full overflow-y-auto my-8 px-6">
        <h1 className="scroll-m-20 text-3xl font-extrabold tracking-tight">All Courses</h1>
        <CoursesTable courses={courses} total={total} />
      </div>
    </>
  )
}
